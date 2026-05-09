/**
 * Finaliza o DB novo (sa-east-1) para virar o ativo:
 *   1. Consolida duplicatas em itens_comanda(comanda_id, produto_id)
 *   2. Aplica os 6 índices da migração 0004_married_luke_cage
 *
 * Operações idempotentes (CREATE INDEX IF NOT EXISTS, e a consolidação
 * é safe pra re-run). Não toca no DB antigo.
 *
 * Uso:  npx tsx --env-file=.env.local scripts/finalize-new-db.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_NEW;
if (!url) {
  console.error("DATABASE_URL_NEW não definida em .env.local.");
  process.exit(1);
}

const host = new URL(url).host;
if (!host.includes("sa-east-1")) {
  console.error(`⛔ Host ${host} não está em sa-east-1. Abortando.`);
  process.exit(1);
}

const sql = neon(url);

const INDEX_DDL: Array<{ name: string; ddl: string }> = [
  {
    name: "caixa_sessoes_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS "caixa_sessoes_status_idx" ON "caixa_sessoes" USING btree ("status")`,
  },
  {
    name: "comandas_sessao_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS "comandas_sessao_status_idx" ON "comandas" USING btree ("caixa_sessao_id","status")`,
  },
  {
    name: "comandas_numero_idx",
    ddl: `CREATE INDEX IF NOT EXISTS "comandas_numero_idx" ON "comandas" USING btree ("numero")`,
  },
  {
    name: "itens_comanda_comanda_idx",
    ddl: `CREATE INDEX IF NOT EXISTS "itens_comanda_comanda_idx" ON "itens_comanda" USING btree ("comanda_id")`,
  },
  {
    name: "itens_comanda_comanda_produto_uq",
    ddl: `CREATE UNIQUE INDEX IF NOT EXISTS "itens_comanda_comanda_produto_uq" ON "itens_comanda" USING btree ("comanda_id","produto_id")`,
  },
  {
    name: "produtos_pdv_idx",
    ddl: `CREATE INDEX IF NOT EXISTS "produtos_pdv_idx" ON "produtos" USING btree ("ativo","disponivel_hoje")`,
  },
];

const EXPECTED = INDEX_DDL.map((i) => i.name);

async function countDups(): Promise<number> {
  const r = (await sql.query(
    `SELECT COUNT(*)::int AS n FROM (
       SELECT 1 FROM itens_comanda
       GROUP BY comanda_id, produto_id HAVING COUNT(*) > 1
     ) x`
  )) as Array<{ n: number }>;
  return r[0]?.n ?? 0;
}

async function listIndexes(): Promise<string[]> {
  const r = (await sql.query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND indexname = ANY($1::text[])
     ORDER BY indexname`,
    [EXPECTED]
  )) as Array<{ indexname: string }>;
  return r.map((row) => row.indexname);
}

async function countItens(): Promise<number> {
  const r = (await sql.query(`SELECT COUNT(*)::int AS n FROM itens_comanda`)) as Array<{ n: number }>;
  return r[0]?.n ?? 0;
}

async function main() {
  console.log(`Conectando: ${host}\n`);

  // ===== Pré-snapshot =====
  const beforeItens = await countItens();
  const beforeDups = await countDups();
  const beforeIdx = await listIndexes();

  console.log("=== Estado antes ===");
  console.log(`itens_comanda total .... ${beforeItens}`);
  console.log(`grupos duplicados ...... ${beforeDups}`);
  console.log(`índices presentes ...... ${beforeIdx.length}/${EXPECTED.length}` + (beforeIdx.length ? ` — ${beforeIdx.join(", ")}` : ""));
  console.log("");

  // ===== Passo 1: consolidação =====
  if (beforeDups > 0) {
    console.log("=== Consolidando duplicatas ===");

    // Atomic SQL: ambos os passos numa CTE que primeiro acha os grupos,
    // depois atualiza o keep_id e marca os outros pra deletar.
    // Na verdade vamos em 2 statements porque é mais legível:
    const upd = (await sql.query(
      `WITH agg AS (
         SELECT comanda_id, produto_id,
                MIN(id)         AS keep_id,
                SUM(quantidade) AS qtd_total,
                SUM(subtotal)   AS sub_total
         FROM itens_comanda
         GROUP BY comanda_id, produto_id
         HAVING COUNT(*) > 1
       )
       UPDATE itens_comanda AS ic
       SET quantidade = agg.qtd_total,
           subtotal   = agg.sub_total
       FROM agg
       WHERE ic.id = agg.keep_id`
    )) as unknown as { rowCount?: number };
    console.log(`  UPDATE consolidou linhas (driver não retorna rowCount aqui)`);

    const del = (await sql.query(
      `DELETE FROM itens_comanda AS ic
       USING (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY comanda_id, produto_id ORDER BY id
                ) AS rn
         FROM itens_comanda
       ) AS ranked
       WHERE ic.id = ranked.id AND ranked.rn > 1`
    )) as unknown as { rowCount?: number };
    console.log(`  DELETE removeu duplicatas`);

    const dupsAfter = await countDups();
    if (dupsAfter !== 0) {
      console.error(`\n⛔ Após consolidação ainda há ${dupsAfter} grupos duplicados — abortando antes de criar índices.`);
      process.exit(2);
    }
    console.log(`  ✓ duplicatas zeradas`);
  } else {
    console.log("(sem duplicatas, pulando consolidação)");
  }
  console.log("");

  // ===== Passo 2: índices =====
  console.log("=== Aplicando 6 índices da migração 0004 ===");
  for (const { name, ddl } of INDEX_DDL) {
    await sql.query(ddl);
    console.log(`  ✓ ${name}`);
  }
  console.log("");

  // ===== Pós-snapshot =====
  const afterItens = await countItens();
  const afterDups = await countDups();
  const afterIdx = await listIndexes();

  console.log("=== Estado depois ===");
  console.log(`itens_comanda total .... ${afterItens} (era ${beforeItens}, delta ${afterItens - beforeItens})`);
  console.log(`grupos duplicados ...... ${afterDups}`);
  console.log(`índices presentes ...... ${afterIdx.length}/${EXPECTED.length}`);
  for (const n of afterIdx) console.log(`  • ${n}`);

  const faltando = EXPECTED.filter((n) => !afterIdx.includes(n));
  if (faltando.length > 0) {
    console.error(`\n⛔ Índices faltando: ${faltando.join(", ")}`);
    process.exit(3);
  }
  if (afterDups !== 0) {
    console.error(`\n⛔ Ainda há ${afterDups} grupos duplicados.`);
    process.exit(4);
  }

  console.log("\n✅ DB sa-east-1 finalizado: sem duplicatas, 6 índices aplicados.");
  console.log("Próximo passo: trocar DATABASE_URL no .env.local + Vercel + redeploy.");
}

main().catch((err) => {
  console.error("\nErro fatal:", err);
  process.exit(1);
});

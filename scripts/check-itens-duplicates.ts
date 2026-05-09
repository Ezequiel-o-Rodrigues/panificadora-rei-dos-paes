/**
 * Verifica se itens_comanda tem duplicatas em (comanda_id, produto_id) que
 * impediriam a criação da UNIQUE INDEX itens_comanda_comanda_produto_uq.
 *
 * Uso:  tsx --env-file=.env.local scripts/check-itens-duplicates.ts
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  const host = new URL(url!).host;
  console.log(`Conectado em: ${host}\n`);

  const dups = await sql`
    SELECT
      ic.comanda_id,
      ic.produto_id,
      c.numero       AS comanda_numero,
      c.status       AS comanda_status,
      COUNT(*)::int  AS linhas,
      SUM(ic.quantidade)::text AS qtd_total
    FROM itens_comanda ic
    JOIN comandas c ON c.id = ic.comanda_id
    GROUP BY ic.comanda_id, ic.produto_id, c.numero, c.status
    HAVING COUNT(*) > 1
    ORDER BY linhas DESC, ic.comanda_id;
  `;

  if (dups.length === 0) {
    console.log("✅ Sem duplicatas. UNIQUE pode ser criada com segurança.");
    process.exit(0);
  }

  console.log(`⚠️  ${dups.length} grupo(s) duplicado(s) encontrados:\n`);
  console.table(dups);
  console.log(
    "\nA UNIQUE INDEX vai falhar enquanto essas linhas existirem.\n" +
      "Antes de aplicar a migração 0004, consolidar manualmente cada grupo."
  );
  process.exit(2);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});

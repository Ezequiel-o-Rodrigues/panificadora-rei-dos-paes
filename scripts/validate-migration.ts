/**
 * Compara contagem de linhas por tabela entre o DB antigo (us-east-1) e o novo (sa-east-1).
 * Uso:
 *   npm run migrate:validate
 *
 * Espera no .env.local:
 *   DATABASE_URL       = URL antiga (us-east-1)  ← atual, do app rodando hoje
 *   DATABASE_URL_NEW   = URL nova   (sa-east-1)  ← do projeto Neon novo
 */
import { neon } from "@neondatabase/serverless";

const TABLES = [
  "usuarios",
  "categorias",
  "produtos",
  "garcons",
  "caixa_sessoes",
  "comandas",
  "itens_comanda",
  "itens_livres",
  "movimentacoes_estoque",
  "perdas_estoque",
  "comprovantes_venda",
  "configuracoes_sistema",
] as const;

const oldUrl = process.env.DATABASE_URL_OLD ?? process.env.DATABASE_URL;
const newUrl = process.env.DATABASE_URL_NEW;

if (!oldUrl) {
  console.error("DATABASE_URL (ou DATABASE_URL_OLD) não definida.");
  process.exit(1);
}
if (!newUrl) {
  console.error("DATABASE_URL_NEW não definida no .env.local.");
  process.exit(1);
}

const oldSql = neon(oldUrl);
const newSql = neon(newUrl);

async function count(
  sqlFn: ReturnType<typeof neon>,
  table: string,
): Promise<number> {
  const rows = (await sqlFn.query(
    `SELECT COUNT(*)::int AS c FROM "${table}"`,
  )) as { c: number }[];
  return rows[0].c;
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

const colTable = 28;
const colCount = 12;

console.log(
  "Tabela".padEnd(colTable) +
    "us-east-1".padEnd(colCount) +
    "sa-east-1".padEnd(colCount) +
    "Status",
);
console.log("-".repeat(colTable + colCount * 2 + 10));

let mismatches = 0;
let errors = 0;

for (const table of TABLES) {
  try {
    const [oldC, newC] = await Promise.all([
      count(oldSql, table),
      count(newSql, table),
    ]);
    const ok = oldC === newC;
    if (!ok) mismatches++;
    console.log(
      table.padEnd(colTable) +
        fmt(oldC).padEnd(colCount) +
        fmt(newC).padEnd(colCount) +
        (ok ? "✓" : `✗ DIFF (${newC - oldC > 0 ? "+" : ""}${newC - oldC})`),
    );
  } catch (e) {
    errors++;
    console.log(
      table.padEnd(colTable) + "ERROR".padEnd(colCount * 2) + (e as Error).message,
    );
  }
}

console.log();
if (mismatches === 0 && errors === 0) {
  console.log("✓ Todas as tabelas batem. Pode virar a chave com segurança.");
  process.exit(0);
} else {
  if (mismatches > 0) console.log(`✗ ${mismatches} tabela(s) com contagens diferentes.`);
  if (errors > 0) console.log(`✗ ${errors} tabela(s) com erro de query.`);
  console.log("Investigar antes de trocar a DATABASE_URL em produção.");
  process.exit(1);
}

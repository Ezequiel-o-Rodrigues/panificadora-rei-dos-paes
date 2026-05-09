/**
 * Compara DATABASE_URL (antigo us-east-1) e DATABASE_URL_NEW (novo sa-east-1).
 * Mostra:
 *  - Host de cada lado (confirma a região)
 *  - Contagem por tabela quente
 *  - Timestamp da última comanda criada (sinal de frescura do import)
 *  - Diferença em dias se houver gap
 *
 * Uso:  npx tsx --env-file=.env.local scripts/check-import-freshness.ts
 */
import { neon } from "@neondatabase/serverless";

const oldUrl = process.env.DATABASE_URL;
const newUrl = process.env.DATABASE_URL_NEW;

if (!oldUrl || !newUrl) {
  console.error("Defina DATABASE_URL e DATABASE_URL_NEW em .env.local.");
  process.exit(1);
}

const TABLES = [
  "comandas",
  "itens_comanda",
  "itens_livres",
  "movimentacoes_estoque",
  "perdas_estoque",
  "produtos",
  "categorias",
  "usuarios",
];

async function snapshot(label: string, url: string) {
  const sql = neon(url);
  const host = new URL(url).host;

  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = (await sql.query(
      `SELECT COUNT(*)::int AS n FROM ${t}`
    )) as Array<{ n: number }>;
    counts[t] = rows[0]?.n ?? 0;
  }

  const latest = (await sql.query(
    `SELECT MAX(data_abertura) AS last_comanda FROM comandas`
  )) as Array<{ last_comanda: string | null }>;
  const lastComanda = latest[0]?.last_comanda ?? null;

  return { label, host, counts, lastComanda };
}

async function main() {
  console.log("Lendo snapshot dos dois bancos...\n");
  const [oldSnap, newSnap] = await Promise.all([
    snapshot("ANTIGO", oldUrl!),
    snapshot("NOVO  ", newUrl!),
  ]);

  for (const s of [oldSnap, newSnap]) {
    console.log(`${s.label}  host: ${s.host}`);
  }
  console.log("");

  console.log("Contagens por tabela:");
  console.log(
    "tabela".padEnd(24) +
      "antigo".padStart(10) +
      "novo".padStart(10) +
      "delta".padStart(10)
  );
  let mismatch = 0;
  for (const t of TABLES) {
    const a = oldSnap.counts[t];
    const b = newSnap.counts[t];
    const delta = b - a;
    if (delta !== 0) mismatch++;
    console.log(
      t.padEnd(24) +
        String(a).padStart(10) +
        String(b).padStart(10) +
        (delta === 0 ? "  ok" : `  ${delta > 0 ? "+" : ""}${delta}`).padStart(10)
    );
  }

  console.log("\nÚltima comanda (data_abertura):");
  console.log(`  antigo: ${oldSnap.lastComanda}`);
  console.log(`  novo:   ${newSnap.lastComanda}`);

  if (oldSnap.lastComanda && newSnap.lastComanda) {
    const diffMs =
      new Date(oldSnap.lastComanda).getTime() -
      new Date(newSnap.lastComanda).getTime();
    const diffMin = Math.round(diffMs / 60000);
    const diffHours = (diffMs / 3600000).toFixed(1);
    console.log(
      `  gap: ${diffMin} minuto(s) — ${diffHours} hora(s) de comandas mais novas no antigo`
    );
    if (diffMin > 60) {
      console.log(
        "\n⚠️  Gap > 1h — o import provavelmente NÃO é o mais recente."
      );
    }
  }

  console.log("");
  if (mismatch === 0) {
    console.log("✅ Contagens batem exatamente.");
  } else {
    console.log(`⚠️  ${mismatch} tabela(s) com diferença de contagem.`);
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});

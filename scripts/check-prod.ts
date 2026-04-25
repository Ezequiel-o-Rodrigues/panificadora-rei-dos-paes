/**
 * Sanity check pós-migration: lê alguns registros e confirma que as
 * colunas novas (custo_unitario, estoque_maximo) existem e que dados
 * antigos seguem intactos.
 *
 * Uso: npx tsx --env-file=.env.local scripts/check-prod.ts
 */
import { db } from "@/db";

async function main() {
  const produtos = await db.query.produtos.findMany({
    columns: {
      id: true,
      nome: true,
      preco: true,
      custoUnitario: true,
      estoqueAtual: true,
      estoqueMaximo: true,
      ativo: true,
    },
    limit: 8,
  });
  console.log(`PRODUTOS (${produtos.length} amostras):`);
  for (const p of produtos) {
    console.log(
      `  #${p.id} ${p.nome.padEnd(30)} preco=${p.preco}  custo=${p.custoUnitario}  estoque=${p.estoqueAtual}  max=${p.estoqueMaximo}  ativo=${p.ativo}`,
    );
  }

  const sessoes = await db.query.caixaSessoes.findMany({
    columns: { id: true, status: true, valorAbertura: true, dataAbertura: true },
    limit: 3,
  });
  console.log(`\nCAIXA_SESSOES (${sessoes.length}):`);
  for (const s of sessoes) {
    console.log(`  #${s.id} status=${s.status} abertura=R$${s.valorAbertura} (${s.dataAbertura.toISOString()})`);
  }

  const comandas = await db.query.comandas.findMany({
    columns: { id: true, numero: true, status: true, valorTotal: true },
    limit: 5,
  });
  console.log(`\nCOMANDAS (${comandas.length}):`);
  for (const c of comandas) {
    console.log(`  #${c.id} num=${c.numero} status=${c.status} total=R$${c.valorTotal}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

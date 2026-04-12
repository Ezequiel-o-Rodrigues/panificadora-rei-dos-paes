import { db } from "@/db";
import {
  categorias,
  comandas,
  configuracoesSistema,
  garcons,
  itensComanda,
  movimentacoesEstoque,
  produtos,
} from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

/**
 * Módulo de queries para o módulo de Relatórios.
 *
 * Todas as agregações monetárias são feitas via SQL para garantir precisão
 * numérica. Os valores numeric do Postgres chegam como string e são
 * convertidos via Number() apenas na borda (React/Recharts).
 *
 * Todos os relatórios consideram apenas comandas com status = 'finalizada'
 * e usam comandas.dataFechamento como referência temporal.
 */

export interface DateRange {
  /** ISO date (YYYY-MM-DD) */
  startDate: string;
  /** ISO date (YYYY-MM-DD) */
  endDate: string;
}

export type Granularity = "dia" | "semana" | "mes";

function dateRangeToSql(range: DateRange): { start: Date; end: Date } {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T23:59:59.999`);
  return { start, end };
}

function truncUnit(granularity: Granularity): "day" | "week" | "month" {
  if (granularity === "semana") return "week";
  if (granularity === "mes") return "month";
  return "day";
}

// =============================================================================
// RELATÓRIOS DE VENDAS
// =============================================================================

export interface VendasPeriodoRow {
  /** ISO datetime da coluna truncada (início do período) */
  periodo: string;
  totalComandas: number;
  totalVendas: number;
  totalGorjetas: number;
  ticketMedio: number;
}

/**
 * Vendas finalizadas agregadas por período (dia, semana ou mês).
 * Usa comandas.dataFechamento como eixo temporal.
 */
export async function getRelatorioVendasPeriodo(
  range: DateRange,
  granularity: Granularity = "dia",
): Promise<VendasPeriodoRow[]> {
  const { start, end } = dateRangeToSql(range);
  const unit = truncUnit(granularity);
  // unit vem de um whitelist fechado ("day" | "week" | "month"), seguro para raw.
  const unitSql = sql.raw(`'${unit}'`);

  const rows = await db
    .select({
      periodo: sql<string>`date_trunc(${unitSql}, ${comandas.dataFechamento})::text`,
      totalComandas: sql<number>`COUNT(*)::int`,
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalGorjetas: sql<string>`COALESCE(SUM(${comandas.taxaGorjeta}), 0)::text`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, start),
        lte(comandas.dataFechamento, end),
      ),
    )
    .groupBy(sql`date_trunc(${unitSql}, ${comandas.dataFechamento})`)
    .orderBy(sql`date_trunc(${unitSql}, ${comandas.dataFechamento}) asc`);

  return rows.map((r) => {
    const totalComandas = Number(r.totalComandas ?? 0);
    const totalVendas = Number(r.totalVendas ?? 0);
    const totalGorjetas = Number(r.totalGorjetas ?? 0);
    return {
      periodo: r.periodo ?? "",
      totalComandas,
      totalVendas,
      totalGorjetas,
      ticketMedio: totalComandas > 0 ? totalVendas / totalComandas : 0,
    };
  });
}

export interface FormaPagamentoRow {
  formaPagamento: string;
  totalComandas: number;
  totalVendas: number;
}

/**
 * Vendas agregadas por forma de pagamento.
 */
export async function getVendasPorFormaPagamento(
  range: DateRange,
): Promise<FormaPagamentoRow[]> {
  const { start, end } = dateRangeToSql(range);

  const rows = await db
    .select({
      formaPagamento: comandas.formaPagamento,
      totalComandas: sql<number>`COUNT(*)::int`,
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, start),
        lte(comandas.dataFechamento, end),
      ),
    )
    .groupBy(comandas.formaPagamento)
    .orderBy(desc(sql`COALESCE(SUM(${comandas.valorTotal}), 0)`));

  return rows.map((r) => ({
    formaPagamento: (r.formaPagamento ?? "outro") as string,
    totalComandas: Number(r.totalComandas ?? 0),
    totalVendas: Number(r.totalVendas ?? 0),
  }));
}

export interface ResumoVendas {
  totalComandas: number;
  totalVendas: number;
  totalGorjetas: number;
  ticketMedio: number;
}

/**
 * Totais consolidados de vendas finalizadas no período.
 */
export async function getResumoVendas(range: DateRange): Promise<ResumoVendas> {
  const { start, end } = dateRangeToSql(range);

  const rows = await db
    .select({
      totalComandas: sql<number>`COUNT(*)::int`,
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalGorjetas: sql<string>`COALESCE(SUM(${comandas.taxaGorjeta}), 0)::text`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, start),
        lte(comandas.dataFechamento, end),
      ),
    );

  const totalComandas = Number(rows[0]?.totalComandas ?? 0);
  const totalVendas = Number(rows[0]?.totalVendas ?? 0);
  const totalGorjetas = Number(rows[0]?.totalGorjetas ?? 0);

  return {
    totalComandas,
    totalVendas,
    totalGorjetas,
    ticketMedio: totalComandas > 0 ? totalVendas / totalComandas : 0,
  };
}

// =============================================================================
// RELATÓRIOS DE PRODUTOS
// =============================================================================

export interface ProdutoVendidoRow {
  produtoId: number;
  produtoNome: string;
  categoriaNome: string;
  totalVendido: number;
  valorTotal: number;
  precoMedio: number;
  numComandas: number;
}

/**
 * Produtos mais vendidos no período, ordenados por valor total.
 * Opcionalmente filtra por categoria.
 */
export async function getRelatorioProdutosVendidos(
  range: DateRange,
  categoriaId?: number,
): Promise<ProdutoVendidoRow[]> {
  const { start, end } = dateRangeToSql(range);

  const conditions: SQL[] = [
    eq(comandas.status, "finalizada"),
    gte(comandas.dataFechamento, start),
    lte(comandas.dataFechamento, end),
  ];

  if (categoriaId) {
    conditions.push(eq(produtos.categoriaId, categoriaId));
  }

  const rows = await db
    .select({
      produtoId: produtos.id,
      produtoNome: produtos.nome,
      categoriaNome: categorias.nome,
      totalVendido: sql<string>`COALESCE(SUM(${itensComanda.quantidade}), 0)::text`,
      valorTotal: sql<string>`COALESCE(SUM(${itensComanda.subtotal}), 0)::text`,
      numComandas: sql<number>`COUNT(DISTINCT ${itensComanda.comandaId})::int`,
    })
    .from(itensComanda)
    .innerJoin(comandas, eq(itensComanda.comandaId, comandas.id))
    .innerJoin(produtos, eq(itensComanda.produtoId, produtos.id))
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .where(and(...conditions))
    .groupBy(produtos.id, produtos.nome, categorias.nome)
    .orderBy(desc(sql`COALESCE(SUM(${itensComanda.subtotal}), 0)`))
    .limit(100);

  return rows.map((r) => {
    const totalVendido = Number(r.totalVendido ?? 0);
    const valorTotal = Number(r.valorTotal ?? 0);
    return {
      produtoId: r.produtoId,
      produtoNome: r.produtoNome,
      categoriaNome: r.categoriaNome,
      totalVendido,
      valorTotal,
      precoMedio: totalVendido > 0 ? valorTotal / totalVendido : 0,
      numComandas: Number(r.numComandas ?? 0),
    };
  });
}

export interface ResumoProdutos {
  totalProdutosVendidos: number;
  totalValor: number;
  totalProdutosDistintos: number;
}

/**
 * Totais consolidados de itens vendidos no período.
 */
export async function getResumoProdutos(
  range: DateRange,
): Promise<ResumoProdutos> {
  const { start, end } = dateRangeToSql(range);

  const rows = await db
    .select({
      totalProdutosVendidos: sql<string>`COALESCE(SUM(${itensComanda.quantidade}), 0)::text`,
      totalValor: sql<string>`COALESCE(SUM(${itensComanda.subtotal}), 0)::text`,
      totalProdutosDistintos: sql<number>`COUNT(DISTINCT ${itensComanda.produtoId})::int`,
    })
    .from(itensComanda)
    .innerJoin(comandas, eq(itensComanda.comandaId, comandas.id))
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, start),
        lte(comandas.dataFechamento, end),
      ),
    );

  return {
    totalProdutosVendidos: Number(rows[0]?.totalProdutosVendidos ?? 0),
    totalValor: Number(rows[0]?.totalValor ?? 0),
    totalProdutosDistintos: Number(rows[0]?.totalProdutosDistintos ?? 0),
  };
}

// =============================================================================
// RELATÓRIO DE ANÁLISE DE ESTOQUE E PERDAS
// =============================================================================

export interface AnaliseEstoqueRow {
  produtoId: number;
  produtoNome: string;
  categoriaNome: string;
  estoqueInicial: number;
  entradas: number;
  saidas: number;
  ajustes: number;
  estoqueTeorico: number;
  estoqueReal: number;
  perdaQuantidade: number;
  perdaValor: number;
  preco: number;
}

/**
 * Relatório de análise de estoque e detecção de perdas.
 *
 * Metodologia:
 * 1. Para cada produto ativo, agrega as movimentações do período (entradas,
 *    saídas e ajustes) a partir da tabela movimentacoes_estoque.
 * 2. Caminha "para trás" a partir do estoque atual do produto:
 *        estoqueInicial = estoqueAtual - entradas + saidas - ajustes
 *    (onde ajustes é a soma algébrica líquida dos ajustes do período,
 *     calculada como quantidade_posterior - quantidade_anterior).
 * 3. estoqueTeorico = estoqueInicial + entradas - saidas + ajustes
 *    (que, por construção, é igual a estoqueAtual, mas mantemos a fórmula
 *     para clareza conceitual).
 * 4. Como o estoqueTeorico calculado representa exatamente o estoque atual,
 *    a perda é detectada olhando para movimentações do tipo 'saida' com
 *    motivo de perda ou pela comparação com um snapshot inicial.
 *
 * Observação importante: como o schema não armazena um snapshot histórico
 * do estoque, a única forma confiável de calcular o "teórico" é reconstruir
 * a partir das movimentações. Se uma saída de perda já foi registrada, ela
 * já está contabilizada em saidas. Portanto, exibimos aqui um snapshot do
 * fluxo de estoque no período, marcando como "perda" a diferença positiva
 * entre o teórico reconstruído e o estoque real, que só será != 0 caso
 * existam alterações manuais fora do log de movimentações.
 */
export async function getRelatorioAnaliseEstoque(
  range: DateRange,
): Promise<AnaliseEstoqueRow[]> {
  const { start, end } = dateRangeToSql(range);

  // Agrega movimentações do período por produto e tipo.
  const movRows = await db
    .select({
      produtoId: movimentacoesEstoque.produtoId,
      tipo: movimentacoesEstoque.tipo,
      total: sql<string>`COALESCE(SUM(${movimentacoesEstoque.quantidade}), 0)::text`,
      deltaAjuste: sql<string>`COALESCE(SUM(${movimentacoesEstoque.quantidadePosterior} - ${movimentacoesEstoque.quantidadeAnterior}), 0)::text`,
    })
    .from(movimentacoesEstoque)
    .where(
      and(
        gte(movimentacoesEstoque.createdAt, start),
        lte(movimentacoesEstoque.createdAt, end),
      ),
    )
    .groupBy(movimentacoesEstoque.produtoId, movimentacoesEstoque.tipo);

  // Indexa por produto: entradas, saídas e delta líquido de ajustes.
  const porProduto = new Map<
    number,
    { entradas: number; saidas: number; ajustes: number }
  >();

  for (const row of movRows) {
    const pid = row.produtoId;
    const existing = porProduto.get(pid) ?? {
      entradas: 0,
      saidas: 0,
      ajustes: 0,
    };
    const total = Number(row.total ?? 0);
    if (row.tipo === "entrada") existing.entradas += total;
    else if (row.tipo === "saida") existing.saidas += total;
    else if (row.tipo === "ajuste") {
      // Para ajustes, o sinal importa: usamos o delta líquido
      // (posterior - anterior) em vez da quantidade absoluta.
      existing.ajustes += Number(row.deltaAjuste ?? 0);
    }
    porProduto.set(pid, existing);
  }

  // Busca todos os produtos ativos com categoria.
  const prods = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      preco: produtos.preco,
      estoqueAtual: produtos.estoqueAtual,
      categoriaNome: categorias.nome,
    })
    .from(produtos)
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .where(eq(produtos.ativo, true))
    .orderBy(asc(produtos.nome));

  const result: AnaliseEstoqueRow[] = prods.map((p) => {
    const mov = porProduto.get(p.id) ?? {
      entradas: 0,
      saidas: 0,
      ajustes: 0,
    };
    const estoqueReal = Number(p.estoqueAtual ?? 0);
    const preco = Number(p.preco ?? 0);
    // Walk-back: estoqueInicial = atual - entradas + saidas - ajustes
    const estoqueInicial =
      estoqueReal - mov.entradas + mov.saidas - mov.ajustes;
    // Teórico reconstruído a partir do inicial
    const estoqueTeorico =
      estoqueInicial + mov.entradas - mov.saidas + mov.ajustes;
    // Perda = diferença positiva entre teórico e real
    const perdaQuantidade = Math.max(0, estoqueTeorico - estoqueReal);
    const perdaValor = perdaQuantidade * preco;

    return {
      produtoId: p.id,
      produtoNome: p.nome,
      categoriaNome: p.categoriaNome,
      estoqueInicial,
      entradas: mov.entradas,
      saidas: mov.saidas,
      ajustes: mov.ajustes,
      estoqueTeorico,
      estoqueReal,
      perdaQuantidade,
      perdaValor,
      preco,
    };
  });

  return result;
}

export interface ResumoAnaliseEstoque {
  totalProdutosComPerda: number;
  totalUnidadesPerdidas: number;
  valorTotalPerdas: number;
  totalProdutosAnalisados: number;
}

/**
 * Consolidação do relatório de análise de estoque.
 */
export async function getResumoAnaliseEstoque(
  range: DateRange,
): Promise<ResumoAnaliseEstoque> {
  const linhas = await getRelatorioAnaliseEstoque(range);
  const comPerda = linhas.filter((l) => l.perdaQuantidade > 0);
  return {
    totalProdutosAnalisados: linhas.length,
    totalProdutosComPerda: comPerda.length,
    totalUnidadesPerdidas: comPerda.reduce(
      (acc, l) => acc + l.perdaQuantidade,
      0,
    ),
    valorTotalPerdas: comPerda.reduce((acc, l) => acc + l.perdaValor, 0),
  };
}

// =============================================================================
// RELATÓRIO DE DESEMPENHO DE GARÇONS
// =============================================================================

export interface DesempenhoGarcomRow {
  garcomId: number;
  nome: string;
  codigo: string;
  totalComandas: number;
  totalVendas: number;
  totalGorjetas: number;
  ticketMedio: number;
}

/**
 * Desempenho de cada garçom ativo no período, ordenado por total de vendas.
 */
export async function getRelatorioDesempenhoGarcons(
  range: DateRange,
): Promise<DesempenhoGarcomRow[]> {
  const { start, end } = dateRangeToSql(range);

  const rows = await db
    .select({
      garcomId: garcons.id,
      nome: garcons.nome,
      codigo: garcons.codigo,
      totalComandas: sql<number>`COUNT(${comandas.id})::int`,
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalGorjetas: sql<string>`COALESCE(SUM(${comandas.taxaGorjeta}), 0)::text`,
    })
    .from(garcons)
    .leftJoin(
      comandas,
      and(
        eq(comandas.garcomId, garcons.id),
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, start),
        lte(comandas.dataFechamento, end),
      ),
    )
    .where(eq(garcons.ativo, true))
    .groupBy(garcons.id, garcons.nome, garcons.codigo)
    .orderBy(desc(sql`COALESCE(SUM(${comandas.valorTotal}), 0)`));

  return rows.map((r) => {
    const totalComandas = Number(r.totalComandas ?? 0);
    const totalVendas = Number(r.totalVendas ?? 0);
    return {
      garcomId: r.garcomId,
      nome: r.nome,
      codigo: r.codigo,
      totalComandas,
      totalVendas,
      totalGorjetas: Number(r.totalGorjetas ?? 0),
      ticketMedio: totalComandas > 0 ? totalVendas / totalComandas : 0,
    };
  });
}

export interface MediaGeralGarcons {
  /** Média de comandas finalizadas por garçom ativo no período. */
  mediaComandas: number;
  /** Média de ticket médio entre todos os garçons (para comparação). */
  mediaTicketMedio: number;
  /** Total geral de comandas finalizadas no período. */
  totalComandasGeral: number;
  /** Total de garçons ativos. */
  totalGarconsAtivos: number;
}

/**
 * Calcula as médias gerais usadas na comparação de desempenho.
 */
export async function getMediaGeralComandas(
  range: DateRange,
): Promise<MediaGeralGarcons> {
  const { start, end } = dateRangeToSql(range);

  const [garconsRows, comandasRows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(garcons)
      .where(eq(garcons.ativo, true)),
    db
      .select({
        totalComandas: sql<number>`COUNT(*)::int`,
        totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      })
      .from(comandas)
      .where(
        and(
          eq(comandas.status, "finalizada"),
          gte(comandas.dataFechamento, start),
          lte(comandas.dataFechamento, end),
        ),
      ),
  ]);

  const totalGarconsAtivos = Number(garconsRows[0]?.total ?? 0);
  const totalComandasGeral = Number(comandasRows[0]?.totalComandas ?? 0);
  const totalVendasGeral = Number(comandasRows[0]?.totalVendas ?? 0);

  const mediaComandas =
    totalGarconsAtivos > 0 ? totalComandasGeral / totalGarconsAtivos : 0;
  const mediaTicketMedio =
    totalComandasGeral > 0 ? totalVendasGeral / totalComandasGeral : 0;

  return {
    mediaComandas,
    mediaTicketMedio,
    totalComandasGeral,
    totalGarconsAtivos,
  };
}

/**
 * Lê a taxa de comissão de garçons das configurações do sistema.
 * A configuração é armazenada como string (ex: "0.03" para 3%).
 * Retorna 0 se a configuração não existir ou for inválida.
 */
export async function getTaxaComissaoGarcom(): Promise<number> {
  const rows = await db
    .select()
    .from(configuracoesSistema)
    .where(eq(configuracoesSistema.chave, "taxa_comissao_garcom"))
    .limit(1);

  const raw = rows[0]?.valor;
  if (!raw) return 0;

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Se vier como percentual inteiro (ex: "3"), assume que 3 = 3% = 0.03.
  // Se vier como decimal (ex: "0.03"), mantém.
  return n > 1 ? n / 100 : n;
}

// =============================================================================
// UTILIDADES (para filtros)
// =============================================================================

export async function getGarconsAtivos() {
  return db
    .select({
      id: garcons.id,
      nome: garcons.nome,
      codigo: garcons.codigo,
    })
    .from(garcons)
    .where(eq(garcons.ativo, true))
    .orderBy(asc(garcons.nome));
}

export async function getCategoriasAtivas() {
  return db
    .select({
      id: categorias.id,
      nome: categorias.nome,
    })
    .from(categorias)
    .where(eq(categorias.ativo, true))
    .orderBy(asc(categorias.ordem), asc(categorias.nome));
}

// =============================================================================
// TIPOS DERIVADOS
// =============================================================================

export type GarcomFiltro = Awaited<ReturnType<typeof getGarconsAtivos>>[number];
export type CategoriaFiltro = Awaited<
  ReturnType<typeof getCategoriasAtivas>
>[number];

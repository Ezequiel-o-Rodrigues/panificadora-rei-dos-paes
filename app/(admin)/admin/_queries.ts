import { db } from "@/db";
import {
  categorias,
  comandas,
  itensComanda,
  produtos,
} from "@/db/schema";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

/**
 * Helpers
 */
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDM(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

const MESES_PT: readonly string[] = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/**
 * Vendas do dia (somatório das comandas finalizadas hoje).
 */
export async function getVendasHoje(): Promise<number> {
  const inicio = startOfToday();
  const fim = endOfToday();

  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, inicio),
        lte(comandas.dataFechamento, fim),
      ),
    );

  return toNumber(row?.total);
}

/**
 * Total de comandas abertas no momento.
 */
export async function getComandasAbertas(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(comandas)
    .where(eq(comandas.status, "aberta"));

  return toNumber(row?.total);
}

/**
 * Total de produtos ativos cadastrados.
 */
export async function getTotalProdutosAtivos(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(produtos)
    .where(eq(produtos.ativo, true));

  return toNumber(row?.total);
}

/**
 * Produtos ativos cujo estoque atual está menor ou igual ao mínimo.
 */
export async function getEstoqueCritico(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(produtos)
    .where(
      and(
        eq(produtos.ativo, true),
        sql`${produtos.estoqueAtual} <= ${produtos.estoqueMinimo}`,
      ),
    );

  return toNumber(row?.total);
}

export interface VendaDiaria {
  dia: string; // YYYY-MM-DD
  label: string; // DD/MM
  total: number;
}

/**
 * Vendas agrupadas por dia nos últimos 7 dias (hoje incluso).
 * Dias sem vendas são preenchidos com 0.
 */
export async function getVendasUltimos7Dias(): Promise<VendaDiaria[]> {
  const hoje = startOfToday();
  const inicio = addDays(hoje, -6);

  const rows = await db
    .select({
      dia: sql<string>`TO_CHAR(${comandas.dataFechamento}, 'YYYY-MM-DD')`,
      total: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, inicio),
        lte(comandas.dataFechamento, endOfToday()),
      ),
    )
    .groupBy(sql`TO_CHAR(${comandas.dataFechamento}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${comandas.dataFechamento}, 'YYYY-MM-DD') ASC`);

  const mapa = new Map<string, number>();
  for (const row of rows) {
    if (row.dia) mapa.set(row.dia, toNumber(row.total));
  }

  const resultado: VendaDiaria[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dia = addDays(inicio, i);
    const chave = formatYMD(dia);
    resultado.push({
      dia: chave,
      label: formatDM(dia),
      total: mapa.get(chave) ?? 0,
    });
  }

  return resultado;
}

export interface CategoriaVenda {
  nome: string;
  totalVendas: number;
}

/**
 * Top categorias por vendas nos últimos 30 dias.
 */
export async function getTopCategorias(limit = 8): Promise<CategoriaVenda[]> {
  const inicio = addDays(startOfToday(), -30);

  const rows = await db
    .select({
      categoriaId: categorias.id,
      nome: categorias.nome,
      totalVendas: sql<string>`COALESCE(SUM(${itensComanda.subtotal}), 0)::text`,
    })
    .from(itensComanda)
    .innerJoin(produtos, eq(itensComanda.produtoId, produtos.id))
    .innerJoin(categorias, eq(produtos.categoriaId, categorias.id))
    .innerJoin(comandas, eq(itensComanda.comandaId, comandas.id))
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, inicio),
      ),
    )
    .groupBy(categorias.id, categorias.nome)
    .orderBy(desc(sql`SUM(${itensComanda.subtotal})`))
    .limit(limit);

  return rows
    .map((row) => ({
      nome: row.nome,
      totalVendas: toNumber(row.totalVendas),
    }))
    .filter((r) => r.totalVendas > 0);
}

export interface VendaMensal {
  mes: number; // 1..12
  label: string; // "Jan".."Dez"
  totalVendas: number;
  totalComandas: number;
}

/**
 * Vendas mensais do ano informado (padrão: ano corrente).
 * Retorna sempre os 12 meses, preenchendo com 0 quando não há dados.
 */
export async function getVendasMensais(ano?: number): Promise<VendaMensal[]> {
  const anoAlvo = ano ?? new Date().getFullYear();
  const inicioAno = new Date(anoAlvo, 0, 1, 0, 0, 0, 0);
  const fimAno = new Date(anoAlvo, 11, 31, 23, 59, 59, 999);

  const rows = await db
    .select({
      mes: sql<number>`EXTRACT(MONTH FROM ${comandas.dataFechamento})::int`,
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalComandas: sql<number>`COUNT(*)::int`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, inicioAno),
        lte(comandas.dataFechamento, fimAno),
      ),
    )
    .groupBy(sql`EXTRACT(MONTH FROM ${comandas.dataFechamento})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${comandas.dataFechamento}) ASC`);

  const mapa = new Map<number, { totalVendas: number; totalComandas: number }>();
  for (const row of rows) {
    const mes = Number(row.mes);
    if (Number.isFinite(mes)) {
      mapa.set(mes, {
        totalVendas: toNumber(row.totalVendas),
        totalComandas: toNumber(row.totalComandas),
      });
    }
  }

  const resultado: VendaMensal[] = [];
  for (let mes = 1; mes <= 12; mes += 1) {
    const atual = mapa.get(mes);
    resultado.push({
      mes,
      label: MESES_PT[mes - 1] ?? String(mes),
      totalVendas: atual?.totalVendas ?? 0,
      totalComandas: atual?.totalComandas ?? 0,
    });
  }

  return resultado;
}

/**
 * Últimas comandas finalizadas com dados do garçom.
 */
export async function getComandasRecentes(limit = 10) {
  return db.query.comandas.findMany({
    where: eq(comandas.status, "finalizada"),
    with: {
      garcom: true,
    },
    orderBy: [desc(comandas.dataFechamento)],
    limit,
  });
}

export type ComandaRecente = Awaited<
  ReturnType<typeof getComandasRecentes>
>[number];

export interface ResumoMes {
  totalVendas: number;
  totalComandas: number;
  ticketMedio: number;
}

/**
 * Resumo de vendas do mês corrente.
 */
export async function getResumoVendasMes(): Promise<ResumoMes> {
  const hoje = new Date();
  const inicioMes = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const fimMes = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const [row] = await db
    .select({
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalComandas: sql<number>`COUNT(*)::int`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.status, "finalizada"),
        gte(comandas.dataFechamento, inicioMes),
        lte(comandas.dataFechamento, fimMes),
      ),
    );

  const totalVendas = toNumber(row?.totalVendas);
  const totalComandas = toNumber(row?.totalComandas);
  const ticketMedio = totalComandas > 0 ? totalVendas / totalComandas : 0;

  return {
    totalVendas,
    totalComandas,
    ticketMedio,
  };
}

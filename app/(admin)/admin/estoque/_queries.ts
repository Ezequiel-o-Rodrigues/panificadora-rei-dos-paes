import { db } from "@/db";
import {
  produtos,
  movimentacoesEstoque,
  perdasEstoque,
} from "@/db/schema";
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

export type AlertLevel = "normal" | "baixo" | "critico";

function toStartOfDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function toEndOfDay(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`);
}

function computeAlertLevel(
  estoqueAtual: string,
  estoqueMinimo: string,
): AlertLevel {
  const atual = Number(estoqueAtual);
  const minimo = Number(estoqueMinimo);
  if (atual <= 0) return "critico";
  if (atual <= minimo) return "baixo";
  return "normal";
}

/**
 * Retorna todos os produtos ativos com a respectiva categoria,
 * ordenados por nome, e com o nível de alerta calculado.
 */
export async function getEstoqueResumo() {
  const rows = await db.query.produtos.findMany({
    where: eq(produtos.ativo, true),
    with: { categoria: true },
    orderBy: [asc(produtos.nome)],
  });

  return rows.map((p) => ({
    ...p,
    alertLevel: computeAlertLevel(p.estoqueAtual, p.estoqueMinimo),
    valorTotal: (Number(p.estoqueAtual) * Number(p.preco)).toFixed(2),
  }));
}

export type EstoqueResumoItem = Awaited<
  ReturnType<typeof getEstoqueResumo>
>[number];

/**
 * Produtos com estoque abaixo (ou igual) ao mínimo, considerando apenas ativos.
 */
export async function getProdutosEstoqueCritico() {
  const rows = await db
    .select()
    .from(produtos)
    .where(
      and(
        eq(produtos.ativo, true),
        lte(produtos.estoqueAtual, produtos.estoqueMinimo),
      ),
    )
    .orderBy(asc(produtos.nome));

  return rows;
}

interface MovimentacoesFilters {
  produtoId?: number;
  tipo?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Histórico de movimentações com produto e usuário relacionados.
 * Limite de 200 registros, mais recentes primeiro.
 */
export async function getMovimentacoes(filters?: MovimentacoesFilters) {
  const conditions: SQL[] = [];

  if (filters?.produtoId) {
    conditions.push(eq(movimentacoesEstoque.produtoId, filters.produtoId));
  }

  if (filters?.tipo) {
    conditions.push(
      eq(
        movimentacoesEstoque.tipo,
        filters.tipo as "entrada" | "saida" | "ajuste",
      ),
    );
  }

  if (filters?.startDate) {
    conditions.push(
      gte(movimentacoesEstoque.createdAt, toStartOfDay(filters.startDate)),
    );
  }

  if (filters?.endDate) {
    conditions.push(
      lte(movimentacoesEstoque.createdAt, toEndOfDay(filters.endDate)),
    );
  }

  return db.query.movimentacoesEstoque.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      produto: true,
      usuario: true,
    },
    orderBy: [desc(movimentacoesEstoque.createdAt)],
    limit: 200,
  });
}

export type MovimentacaoListItem = Awaited<
  ReturnType<typeof getMovimentacoes>
>[number];

interface PerdasFilters {
  apenasNaoVisualizadas?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Lista de perdas de estoque com produto e usuário relacionados.
 */
export async function getPerdas(filters?: PerdasFilters) {
  const conditions: SQL[] = [];

  if (filters?.apenasNaoVisualizadas) {
    conditions.push(eq(perdasEstoque.visualizada, false));
  }

  if (filters?.startDate) {
    conditions.push(
      gte(perdasEstoque.createdAt, toStartOfDay(filters.startDate)),
    );
  }

  if (filters?.endDate) {
    conditions.push(lte(perdasEstoque.createdAt, toEndOfDay(filters.endDate)));
  }

  return db.query.perdasEstoque.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      produto: true,
      usuario: true,
    },
    orderBy: [desc(perdasEstoque.createdAt)],
  });
}

export type PerdaListItem = Awaited<ReturnType<typeof getPerdas>>[number];

/**
 * Resumo agregado para os StatCards da tela principal do estoque.
 */
export async function getResumoEstoque() {
  const [totalProdutosRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(produtos)
    .where(eq(produtos.ativo, true));

  const [estoqueCriticoRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(produtos)
    .where(
      and(
        eq(produtos.ativo, true),
        lte(produtos.estoqueAtual, produtos.estoqueMinimo),
      ),
    );

  const [valorRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${produtos.estoqueAtual} * ${produtos.preco}), 0)::text`,
    })
    .from(produtos)
    .where(eq(produtos.ativo, true));

  const [perdasRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(perdasEstoque)
    .where(eq(perdasEstoque.visualizada, false));

  return {
    totalProdutos: totalProdutosRow?.count ?? 0,
    totalEstoqueCritico: estoqueCriticoRow?.count ?? 0,
    valorTotalEstoque: Number(valorRow?.total ?? 0),
    totalPerdasNaoVisualizadas: perdasRow?.count ?? 0,
  };
}

/**
 * Lista enxuta de produtos ativos para popular selects e formulários.
 */
export async function getProdutosAtivosParaForm() {
  const rows = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      preco: produtos.preco,
      estoqueAtual: produtos.estoqueAtual,
      estoqueMinimo: produtos.estoqueMinimo,
      unidadeMedida: produtos.unidadeMedida,
      categoriaId: produtos.categoriaId,
    })
    .from(produtos)
    .where(eq(produtos.ativo, true))
    .orderBy(asc(produtos.nome));

  return rows;
}

export type ProdutoEstoqueForm = Awaited<
  ReturnType<typeof getProdutosAtivosParaForm>
>[number];

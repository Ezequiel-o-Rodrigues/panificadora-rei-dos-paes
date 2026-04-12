import { db } from "@/db";
import { produtos } from "@/db/schema";
import { and, asc, eq, ilike, type SQL } from "drizzle-orm";

interface ProdutoFilters {
  categoriaId?: number;
  search?: string;
  ativo?: boolean;
}

export async function getProdutos(filters?: ProdutoFilters) {
  const conditions: SQL[] = [];

  if (filters?.categoriaId) {
    conditions.push(eq(produtos.categoriaId, filters.categoriaId));
  }

  if (filters?.search) {
    conditions.push(ilike(produtos.nome, `%${filters.search}%`));
  }

  if (filters?.ativo !== undefined) {
    conditions.push(eq(produtos.ativo, filters.ativo));
  }

  return db.query.produtos.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { categoria: true },
    orderBy: [asc(produtos.nome)],
  });
}

export async function getProdutoById(id: number) {
  return db.query.produtos.findFirst({
    where: eq(produtos.id, id),
    with: { categoria: true },
  });
}

export async function getProdutosParaPDV() {
  const results = await db.query.produtos.findMany({
    where: and(
      eq(produtos.ativo, true),
      eq(produtos.disponivelHoje, true),
    ),
    with: { categoria: true },
    orderBy: [asc(produtos.nome)],
  });

  return results.sort((a, b) => {
    const catCompare = a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR");
    if (catCompare !== 0) return catCompare;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

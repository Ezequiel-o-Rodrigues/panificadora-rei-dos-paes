import { db } from "@/db";
import { categorias, produtos } from "@/db/schema";
import { asc, count, eq } from "drizzle-orm";

export async function getCategorias() {
  return db.query.categorias.findMany({
    orderBy: [asc(categorias.ordem), asc(categorias.nome)],
  });
}

export async function getCategoriasAtivas() {
  return db.query.categorias.findMany({
    where: eq(categorias.ativo, true),
    orderBy: [asc(categorias.ordem), asc(categorias.nome)],
  });
}

export async function getCategoriaById(id: number) {
  return db.query.categorias.findFirst({
    where: eq(categorias.id, id),
  });
}

export async function getProductCountByCategory(): Promise<
  Record<number, number>
> {
  const rows = await db
    .select({
      categoriaId: produtos.categoriaId,
      count: count(),
    })
    .from(produtos)
    .groupBy(produtos.categoriaId);

  const map: Record<number, number> = {};
  for (const row of rows) {
    map[row.categoriaId] = row.count;
  }
  return map;
}

import { db } from "@/db";
import { comandas } from "@/db/schema";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

export interface ComandaFilters {
  status?: "aberta" | "finalizada" | "cancelada";
  garcomId?: number;
  formaPagamento?: "dinheiro" | "debito" | "credito" | "pix" | "voucher" | "outro";
  startDate?: string; // ISO date (YYYY-MM-DD)
  endDate?: string; // ISO date (YYYY-MM-DD)
  search?: string; // search in numero
}

function toStartOfDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function toEndOfDay(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999`);
}

export async function getComandas(filters: ComandaFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(comandas.status, filters.status));
  }

  if (filters.garcomId) {
    conditions.push(eq(comandas.garcomId, filters.garcomId));
  }

  if (filters.formaPagamento) {
    conditions.push(eq(comandas.formaPagamento, filters.formaPagamento));
  }

  if (filters.startDate) {
    conditions.push(gte(comandas.dataAbertura, toStartOfDay(filters.startDate)));
  }

  if (filters.endDate) {
    conditions.push(lte(comandas.dataAbertura, toEndOfDay(filters.endDate)));
  }

  if (filters.search) {
    const numeric = Number(filters.search.replace(/\D/g, ""));
    if (!Number.isNaN(numeric) && numeric > 0) {
      conditions.push(eq(comandas.numero, numeric));
    }
  }

  return db.query.comandas.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      garcom: true,
      caixaSessao: true,
      usuarioAbertura: true,
      itens: {
        columns: { id: true, quantidade: true },
      },
      itensLivres: {
        columns: { id: true, quantidade: true },
      },
    },
    orderBy: [desc(comandas.dataAbertura)],
    limit: 200,
  });
}

export async function getComandaDetalhada(id: number) {
  return db.query.comandas.findFirst({
    where: eq(comandas.id, id),
    with: {
      garcom: true,
      caixaSessao: {
        with: {
          usuarioAbertura: true,
          usuarioFechamento: true,
        },
      },
      usuarioAbertura: true,
      usuarioFechamento: true,
      itens: {
        with: {
          produto: true,
        },
      },
      itensLivres: true,
      comprovantes: true,
    },
  });
}

export async function getResumoFiltros() {
  const garcons = await db.query.garcons.findMany({
    where: (g, { eq: eqFn }) => eqFn(g.ativo, true),
    columns: { id: true, nome: true },
    orderBy: (g, { asc: ascFn }) => [ascFn(g.nome)],
  });

  const statusOptions = [
    { value: "aberta", label: "Aberta" },
    { value: "finalizada", label: "Finalizada" },
    { value: "cancelada", label: "Cancelada" },
  ] as const;

  const formasPagamento = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "debito", label: "Débito" },
    { value: "credito", label: "Crédito" },
    { value: "pix", label: "PIX" },
    { value: "voucher", label: "Voucher" },
    { value: "outro", label: "Outro" },
  ] as const;

  return {
    garcons,
    statusOptions,
    formasPagamento,
  };
}

export type ComandaListItem = Awaited<ReturnType<typeof getComandas>>[number];
export type ComandaDetalhada = NonNullable<
  Awaited<ReturnType<typeof getComandaDetalhada>>
>;

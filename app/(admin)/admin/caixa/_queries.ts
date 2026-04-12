import { db } from "@/db";
import {
  caixaSessoes,
  categorias,
  comandas,
  configuracoesSistema,
  garcons,
  itensComanda,
  itensLivres,
  produtos,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";

/**
 * Retorna a primeira (e única) sessão de caixa aberta, com dados do usuário.
 * Apenas uma sessão pode estar aberta ao mesmo tempo.
 */
export async function getSessaoAberta() {
  return db.query.caixaSessoes.findFirst({
    where: eq(caixaSessoes.status, "aberta"),
    with: {
      usuarioAbertura: true,
    },
    orderBy: [desc(caixaSessoes.dataAbertura)],
  });
}

/**
 * Lista as sessões mais recentes, ordenadas por data de abertura (desc).
 */
export async function getSessoes(limit = 50) {
  return db.query.caixaSessoes.findMany({
    with: {
      usuarioAbertura: true,
      usuarioFechamento: true,
    },
    orderBy: [desc(caixaSessoes.dataAbertura)],
    limit,
  });
}

/**
 * Busca uma sessão específica com todas as suas comandas (incluindo itens).
 */
export async function getSessaoById(id: number) {
  return db.query.caixaSessoes.findFirst({
    where: eq(caixaSessoes.id, id),
    with: {
      usuarioAbertura: true,
      usuarioFechamento: true,
      comandas: {
        with: {
          garcom: true,
          itens: { with: { produto: true } },
          itensLivres: true,
        },
        orderBy: [asc(comandas.numero)],
      },
    },
  });
}

/**
 * Comandas abertas de uma sessão (usado pela interface PDV).
 */
export async function getComandasPorSessao(sessaoId: number) {
  return db.query.comandas.findMany({
    where: and(
      eq(comandas.caixaSessaoId, sessaoId),
      eq(comandas.status, "aberta"),
    ),
    with: {
      garcom: true,
      itens: {
        with: { produto: true },
        orderBy: [asc(itensComanda.createdAt)],
      },
      itensLivres: {
        orderBy: [asc(itensLivres.createdAt)],
      },
    },
    orderBy: [asc(comandas.numero)],
  });
}

/**
 * Calcula o próximo número global de comanda (máximo + 1).
 */
export async function getProximoNumeroComanda(): Promise<number> {
  const result = await db
    .select({ maxNumero: max(comandas.numero) })
    .from(comandas);
  const atual = result[0]?.maxNumero ?? 0;
  return Number(atual) + 1;
}

type FormaPagamentoKey =
  | "dinheiro"
  | "debito"
  | "credito"
  | "pix"
  | "voucher"
  | "outro";

export type ResumoSessao = {
  totalComandas: number;
  totalVendas: number;
  totalGorjetas: number;
  vendasPorFormaPagamento: Record<
    FormaPagamentoKey,
    { total: number; quantidade: number }
  >;
  vendasDinheiro: number;
};

/**
 * Agregados da sessão: total de comandas finalizadas, total vendido,
 * total por forma de pagamento e total em dinheiro (para reconciliação).
 */
export async function getResumoSessao(sessaoId: number): Promise<ResumoSessao> {
  const totaisRows = await db
    .select({
      totalVendas: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      totalGorjetas: sql<string>`COALESCE(SUM(${comandas.taxaGorjeta}), 0)::text`,
      totalComandas: sql<number>`COUNT(*)::int`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.caixaSessaoId, sessaoId),
        eq(comandas.status, "finalizada"),
      ),
    );

  const totalVendas = Number(totaisRows[0]?.totalVendas ?? 0);
  const totalGorjetas = Number(totaisRows[0]?.totalGorjetas ?? 0);
  const totalComandas = Number(totaisRows[0]?.totalComandas ?? 0);

  const porFormaRows = await db
    .select({
      formaPagamento: comandas.formaPagamento,
      total: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      quantidade: sql<number>`COUNT(*)::int`,
    })
    .from(comandas)
    .where(
      and(
        eq(comandas.caixaSessaoId, sessaoId),
        eq(comandas.status, "finalizada"),
      ),
    )
    .groupBy(comandas.formaPagamento);

  const vendasPorFormaPagamento: Record<
    FormaPagamentoKey,
    { total: number; quantidade: number }
  > = {
    dinheiro: { total: 0, quantidade: 0 },
    debito: { total: 0, quantidade: 0 },
    credito: { total: 0, quantidade: 0 },
    pix: { total: 0, quantidade: 0 },
    voucher: { total: 0, quantidade: 0 },
    outro: { total: 0, quantidade: 0 },
  };

  for (const row of porFormaRows) {
    const key = (row.formaPagamento ?? "outro") as FormaPagamentoKey;
    vendasPorFormaPagamento[key] = {
      total: Number(row.total ?? 0),
      quantidade: Number(row.quantidade ?? 0),
    };
  }

  return {
    totalComandas,
    totalVendas,
    totalGorjetas,
    vendasPorFormaPagamento,
    vendasDinheiro: vendasPorFormaPagamento.dinheiro.total,
  };
}

/**
 * Produtos ativos e disponíveis para venda no PDV, com a categoria.
 * Ordenados por categoria (ordem/nome) e depois por nome do produto.
 */
export async function getProdutosParaPDV() {
  const results = await db.query.produtos.findMany({
    where: and(eq(produtos.ativo, true), eq(produtos.disponivelHoje, true)),
    with: { categoria: true },
  });

  return results.sort((a, b) => {
    const ordemCompare = a.categoria.ordem - b.categoria.ordem;
    if (ordemCompare !== 0) return ordemCompare;
    const catCompare = a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR");
    if (catCompare !== 0) return catCompare;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/**
 * Categorias ativas que têm pelo menos um produto ativo e disponível hoje.
 */
export async function getCategoriasComProdutos() {
  const rows = await db
    .selectDistinct({ categoriaId: produtos.categoriaId })
    .from(produtos)
    .where(and(eq(produtos.ativo, true), eq(produtos.disponivelHoje, true)));

  const ids = rows.map((r) => r.categoriaId);
  if (ids.length === 0) return [];

  const cats = await db.query.categorias.findMany({
    where: and(eq(categorias.ativo, true), inArray(categorias.id, ids)),
    orderBy: [asc(categorias.ordem), asc(categorias.nome)],
  });

  return cats;
}

/**
 * Garçons ativos para o select da comanda.
 */
export async function getGarconsAtivos() {
  return db.query.garcons.findMany({
    where: eq(garcons.ativo, true),
    orderBy: [asc(garcons.nome)],
  });
}

export type TipoGorjeta = "percentual" | "fixa" | "nenhuma";

export interface ConfigGorjeta {
  tipo: TipoGorjeta;
  /** String representando a taxa (percentual 0-100 ou valor fixo em reais). */
  taxa: string;
}

/**
 * Lê a configuração de gorjeta das chaves tipo_gorjeta e taxa_gorjeta.
 * Default seguro: nenhuma gorjeta.
 */
export async function getConfigGorjeta(): Promise<ConfigGorjeta> {
  const rows = await db
    .select()
    .from(configuracoesSistema)
    .where(
      inArray(configuracoesSistema.chave, ["tipo_gorjeta", "taxa_gorjeta"]),
    );

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.chave] = row.valor ?? "";
  }

  const tipoRaw = (map["tipo_gorjeta"] ?? "nenhuma").trim();
  const taxaRaw = (map["taxa_gorjeta"] ?? "0").trim() || "0";

  let tipo: TipoGorjeta = "nenhuma";
  if (tipoRaw === "percentual" || tipoRaw === "fixa") tipo = tipoRaw;

  const taxaNum = Number(taxaRaw);
  const taxa = Number.isFinite(taxaNum) ? taxaNum.toFixed(2) : "0.00";

  return { tipo, taxa };
}

// ---------------------------------------------------------------------------
// Tipos derivados (úteis para os componentes client)
// ---------------------------------------------------------------------------

export type SessaoAberta = Awaited<ReturnType<typeof getSessaoAberta>>;
export type SessoesList = Awaited<ReturnType<typeof getSessoes>>;
export type SessaoCompleta = Awaited<ReturnType<typeof getSessaoById>>;
export type ComandaPDV = Awaited<ReturnType<typeof getComandasPorSessao>>[number];
export type ProdutoPDV = Awaited<ReturnType<typeof getProdutosParaPDV>>[number];
export type CategoriaPDV = Awaited<
  ReturnType<typeof getCategoriasComProdutos>
>[number];
export type GarcomPDV = Awaited<ReturnType<typeof getGarconsAtivos>>[number];

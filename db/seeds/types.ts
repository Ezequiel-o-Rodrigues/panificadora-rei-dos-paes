import type { db } from "../index";

export type SeedDb = typeof db;

export type CategoriaSeed = {
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  ordem: number;
};

export type ProdutoSeed = {
  nome: string;
  slug: string;
  categoriaSlug: string;
  descricao: string;
  preco: string;
  estoqueAtual: string;
  estoqueMinimo: string;
  unidadeMedida:
    | "un"
    | "kg"
    | "g"
    | "fatia"
    | "pacote"
    | "porcao"
    | "litro"
    | "ml"
    | "metro"
    | "combo";
  pesoGramas?: number;
  destaque?: boolean;
};

export type SegmentSeed = {
  categorias: CategoriaSeed[];
  produtos: ProdutoSeed[];
};

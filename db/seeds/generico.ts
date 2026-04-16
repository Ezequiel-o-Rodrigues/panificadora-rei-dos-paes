import type { SegmentSeed } from "./types";

export const genericoSeed: SegmentSeed = {
  categorias: [
    { nome: "Produtos", slug: "produtos", descricao: "Produtos do estabelecimento", icone: "📦", ordem: 1 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Bebidas em geral", icone: "🥤", ordem: 2 },
  ],
  produtos: [
    { nome: "Produto Exemplo 1", slug: "produto-1", categoriaSlug: "produtos", descricao: "Produto de exemplo — edite ou remova", preco: "10.00", estoqueAtual: "50", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Produto Exemplo 2", slug: "produto-2", categoriaSlug: "produtos", descricao: "Produto de exemplo — edite ou remova", preco: "20.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Bebida Exemplo", slug: "bebida-1", categoriaSlug: "bebidas", descricao: "Bebida de exemplo — edite ou remova", preco: "6.00", estoqueAtual: "50", estoqueMinimo: "10", unidadeMedida: "un" },
  ],
};

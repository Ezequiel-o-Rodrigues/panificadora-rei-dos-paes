import type { SegmentSeed } from "./types";

export const lanchoneteSeed: SegmentSeed = {
  categorias: [
    { nome: "Lanches", slug: "lanches", descricao: "Hambúrgueres e sanduíches artesanais", icone: "🍔", ordem: 1 },
    { nome: "Porções", slug: "porcoes", descricao: "Porções para compartilhar", icone: "🍟", ordem: 2 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Sucos, refrigerantes e milk-shakes", icone: "🥤", ordem: 3 },
    { nome: "Combos", slug: "combos", descricao: "Lanche + bebida + acompanhamento", icone: "🍱", ordem: 4 },
    { nome: "Sobremesas", slug: "sobremesas", descricao: "Sorvetes, brownies e doces", icone: "🍦", ordem: 5 },
  ],
  produtos: [
    { nome: "X-Burger", slug: "x-burger", categoriaSlug: "lanches", descricao: "Pão, hambúrguer 150g, queijo e salada", preco: "22.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "X-Bacon", slug: "x-bacon", categoriaSlug: "lanches", descricao: "X-Burger com bacon crocante", preco: "26.00", estoqueAtual: "35", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "X-Tudo", slug: "x-tudo", categoriaSlug: "lanches", descricao: "Hambúrguer, bacon, ovo, queijo, presunto e salada", preco: "32.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Batata Frita Média", slug: "batata-frita-media", categoriaSlug: "porcoes", descricao: "Porção média de batata frita", preco: "18.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "porcao" },
    { nome: "Onion Rings", slug: "onion-rings", categoriaSlug: "porcoes", descricao: "Anéis de cebola crocantes", preco: "22.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "porcao" },
    { nome: "Refrigerante 350ml", slug: "refrigerante-350", categoriaSlug: "bebidas", descricao: "Refrigerante lata 350ml", preco: "6.00", estoqueAtual: "150", estoqueMinimo: "20", unidadeMedida: "un" },
    { nome: "Suco Natural 500ml", slug: "suco-natural-500", categoriaSlug: "bebidas", descricao: "Suco natural de fruta da estação", preco: "10.00", estoqueAtual: "50", estoqueMinimo: "10", unidadeMedida: "ml" },
    { nome: "Milk-Shake", slug: "milk-shake", categoriaSlug: "bebidas", descricao: "Milk-shake cremoso 400ml, vários sabores", preco: "14.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Combo Burger", slug: "combo-burger", categoriaSlug: "combos", descricao: "X-Burger + batata média + refrigerante", preco: "38.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "combo", destaque: true },
  ],
};

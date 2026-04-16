import type { SegmentSeed } from "./types";

export const cafeteriaSeed: SegmentSeed = {
  categorias: [
    { nome: "Cafés", slug: "cafes", descricao: "Espressos, filtrados e métodos especiais", icone: "☕", ordem: 1 },
    { nome: "Bebidas Geladas", slug: "bebidas-geladas", descricao: "Frappés, iced coffees e smoothies", icone: "🧊", ordem: 2 },
    { nome: "Doces e Bolos", slug: "doces-bolos", descricao: "Bolos, cookies e doces da casa", icone: "🧁", ordem: 3 },
    { nome: "Salgados", slug: "salgados", descricao: "Quiches, croissants e sanduíches", icone: "🥐", ordem: 4 },
    { nome: "Chás", slug: "chas", descricao: "Chás selecionados e infusões", icone: "🍵", ordem: 5 },
  ],
  produtos: [
    { nome: "Espresso", slug: "espresso", categoriaSlug: "cafes", descricao: "Espresso 50ml, grãos especiais", preco: "6.00", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un", destaque: true },
    { nome: "Capuccino", slug: "capuccino", categoriaSlug: "cafes", descricao: "Espresso, leite vaporizado e espuma cremosa", preco: "12.00", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un", destaque: true },
    { nome: "Latte", slug: "latte", categoriaSlug: "cafes", descricao: "Espresso com leite vaporizado 240ml", preco: "13.00", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un" },
    { nome: "Mocha", slug: "mocha", categoriaSlug: "cafes", descricao: "Espresso, chocolate e leite vaporizado", preco: "15.00", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un" },
    { nome: "Frappé de Caramelo", slug: "frappe-caramelo", categoriaSlug: "bebidas-geladas", descricao: "Bebida gelada com café, leite e caramelo", preco: "16.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Bolo de Cenoura com Chocolate", slug: "bolo-cenoura", categoriaSlug: "doces-bolos", descricao: "Fatia generosa de bolo caseiro", preco: "9.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "fatia" },
    { nome: "Cookie Gotas de Chocolate", slug: "cookie-gotas", categoriaSlug: "doces-bolos", descricao: "Cookie grande com gotas de chocolate belga", preco: "8.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Croissant de Manteiga", slug: "croissant-manteiga", categoriaSlug: "salgados", descricao: "Croissant folhado na manteiga, assado na hora", preco: "11.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Chá Verde", slug: "cha-verde", categoriaSlug: "chas", descricao: "Chá verde sencha 240ml", preco: "9.00", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un" },
  ],
};

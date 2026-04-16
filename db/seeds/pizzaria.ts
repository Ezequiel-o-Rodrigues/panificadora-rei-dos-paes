import type { SegmentSeed } from "./types";

export const pizzariaSeed: SegmentSeed = {
  categorias: [
    { nome: "Pizzas Salgadas", slug: "pizzas-salgadas", descricao: "Sabores tradicionais e especiais", icone: "🍕", ordem: 1 },
    { nome: "Pizzas Doces", slug: "pizzas-doces", descricao: "Pizzas de sobremesa", icone: "🍫", ordem: 2 },
    { nome: "Bordas Recheadas", slug: "bordas", descricao: "Adicionais de borda recheada", icone: "🧀", ordem: 3 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Refrigerantes, sucos e cervejas", icone: "🥤", ordem: 4 },
    { nome: "Combos", slug: "combos", descricao: "Pizza + bebida com desconto", icone: "🍱", ordem: 5 },
  ],
  produtos: [
    { nome: "Pizza Margherita", slug: "pizza-margherita", categoriaSlug: "pizzas-salgadas", descricao: "Molho de tomate, mussarela, manjericão e azeite", preco: "55.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Pizza Calabresa", slug: "pizza-calabresa", categoriaSlug: "pizzas-salgadas", descricao: "Calabresa fatiada, cebola, mussarela e azeitona", preco: "58.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Pizza Portuguesa", slug: "pizza-portuguesa", categoriaSlug: "pizzas-salgadas", descricao: "Presunto, ovos, cebola, mussarela, azeitona", preco: "62.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Pizza Quatro Queijos", slug: "pizza-quatro-queijos", categoriaSlug: "pizzas-salgadas", descricao: "Mussarela, provolone, parmesão e gorgonzola", preco: "68.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Pizza Chocolate com Morango", slug: "pizza-choco-morango", categoriaSlug: "pizzas-doces", descricao: "Chocolate ao leite derretido com morangos frescos", preco: "58.00", estoqueAtual: "20", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
    { nome: "Pizza Romeu e Julieta", slug: "pizza-romeu-julieta", categoriaSlug: "pizzas-doces", descricao: "Goiabada e queijo minas", preco: "52.00", estoqueAtual: "20", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Borda de Catupiry", slug: "borda-catupiry", categoriaSlug: "bordas", descricao: "Adicional de borda recheada com catupiry", preco: "8.00", estoqueAtual: "50", estoqueMinimo: "10", unidadeMedida: "un" },
    { nome: "Refrigerante 2L", slug: "refrigerante-2l", categoriaSlug: "bebidas", descricao: "Refrigerante 2 litros gelado", preco: "14.00", estoqueAtual: "40", estoqueMinimo: "10", unidadeMedida: "litro" },
    { nome: "Combo Pizza Grande + Refri 2L", slug: "combo-grande-refri", categoriaSlug: "combos", descricao: "Pizza grande de qualquer sabor + refrigerante 2L", preco: "68.00", estoqueAtual: "40", estoqueMinimo: "10", unidadeMedida: "combo", destaque: true },
  ],
};

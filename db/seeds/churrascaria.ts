import type { SegmentSeed } from "./types";

export const churrascariaSeed: SegmentSeed = {
  categorias: [
    { nome: "Carnes", slug: "carnes", descricao: "Cortes nobres grelhados na brasa", icone: "🥩", ordem: 1 },
    { nome: "Acompanhamentos", slug: "acompanhamentos", descricao: "Porções e guarnições para seu churrasco", icone: "🥗", ordem: 2 },
    { nome: "Porções", slug: "porcoes", descricao: "Porções para compartilhar", icone: "🍟", ordem: 3 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Cervejas, sucos, refrigerantes e drinks", icone: "🍺", ordem: 4 },
    { nome: "Sobremesas", slug: "sobremesas", descricao: "Doces para fechar a refeição", icone: "🍨", ordem: 5 },
  ],
  produtos: [
    { nome: "Picanha", slug: "picanha", categoriaSlug: "carnes", descricao: "Picanha grelhada ao ponto, corte nobre", preco: "89.90", estoqueAtual: "20", estoqueMinimo: "3", unidadeMedida: "kg", destaque: true },
    { nome: "Fraldinha", slug: "fraldinha", categoriaSlug: "carnes", descricao: "Fraldinha na brasa, maciez garantida", preco: "69.90", estoqueAtual: "15", estoqueMinimo: "3", unidadeMedida: "kg" },
    { nome: "Costela Bovina", slug: "costela-bovina", categoriaSlug: "carnes", descricao: "Costela assada 8h, desmancha no garfo", preco: "79.90", estoqueAtual: "10", estoqueMinimo: "2", unidadeMedida: "kg", destaque: true },
    { nome: "Linguiça Artesanal", slug: "linguica-artesanal", categoriaSlug: "carnes", descricao: "Linguiça de pernil temperada na casa", preco: "12.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Arroz Branco", slug: "arroz-branco", categoriaSlug: "acompanhamentos", descricao: "Arroz branco soltinho, feito na hora", preco: "15.00", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "porcao" },
    { nome: "Farofa de Bacon", slug: "farofa-bacon", categoriaSlug: "acompanhamentos", descricao: "Farofa crocante com bacon defumado", preco: "18.00", estoqueAtual: "20", estoqueMinimo: "3", unidadeMedida: "porcao" },
    { nome: "Vinagrete", slug: "vinagrete", categoriaSlug: "acompanhamentos", descricao: "Vinagrete fresco, tomate, cebola e salsinha", preco: "12.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "porcao" },
    { nome: "Batata Frita", slug: "batata-frita", categoriaSlug: "porcoes", descricao: "Porção generosa de batata frita crocante", preco: "32.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "porcao", destaque: true },
    { nome: "Cerveja Long Neck", slug: "cerveja-long-neck", categoriaSlug: "bebidas", descricao: "Cerveja gelada 355ml", preco: "9.00", estoqueAtual: "200", estoqueMinimo: "30", unidadeMedida: "un" },
    { nome: "Refrigerante Lata", slug: "refrigerante-lata", categoriaSlug: "bebidas", descricao: "Refrigerante gelado 350ml", preco: "6.00", estoqueAtual: "150", estoqueMinimo: "20", unidadeMedida: "un" },
  ],
};

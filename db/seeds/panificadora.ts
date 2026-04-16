import type { SegmentSeed } from "./types";

export const panificadoraSeed: SegmentSeed = {
  categorias: [
    { nome: "Pães", slug: "paes", descricao: "Pães artesanais fresquinhos todos os dias", icone: "🥖", ordem: 1 },
    { nome: "Doces e Confeitaria", slug: "doces", descricao: "Bolos, tortas e doces feitos com carinho", icone: "🍰", ordem: 2 },
    { nome: "Salgados", slug: "salgados", descricao: "Salgados assados e fritos, prontinhos", icone: "🥐", ordem: 3 },
    { nome: "Bolos", slug: "bolos", descricao: "Bolos caseiros e especiais para festas", icone: "🎂", ordem: 4 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Cafés, sucos e refrigerantes", icone: "☕", ordem: 5 },
  ],
  produtos: [
    { nome: "Pão Francês", slug: "pao-frances", categoriaSlug: "paes", descricao: "O clássico pãozinho crocante por fora e macio por dentro", preco: "0.80", estoqueAtual: "200", estoqueMinimo: "20", unidadeMedida: "un", pesoGramas: 50, destaque: true },
    { nome: "Pão de Forma Integral", slug: "pao-forma-integral", categoriaSlug: "paes", descricao: "Pão integral caseiro, grãos selecionados", preco: "14.90", estoqueAtual: "15", estoqueMinimo: "3", unidadeMedida: "un", pesoGramas: 500 },
    { nome: "Pão de Queijo", slug: "pao-de-queijo", categoriaSlug: "paes", descricao: "Queijo minas especial, receita da vovó", preco: "3.50", estoqueAtual: "80", estoqueMinimo: "10", unidadeMedida: "un", pesoGramas: 45, destaque: true },
    { nome: "Bolo de Chocolate", slug: "bolo-de-chocolate", categoriaSlug: "doces", descricao: "Bolo de chocolate com recheio e cobertura", preco: "7.50", estoqueAtual: "12", estoqueMinimo: "2", unidadeMedida: "fatia", destaque: true },
    { nome: "Brigadeiro Gourmet", slug: "brigadeiro-gourmet", categoriaSlug: "doces", descricao: "Brigadeiro feito com chocolate belga", preco: "4.00", estoqueAtual: "40", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Coxinha de Frango", slug: "coxinha-frango", categoriaSlug: "salgados", descricao: "Recheada com frango desfiado e catupiry", preco: "6.50", estoqueAtual: "30", estoqueMinimo: "5", unidadeMedida: "un", pesoGramas: 120, destaque: true },
    { nome: "Empada de Palmito", slug: "empada-palmito", categoriaSlug: "salgados", descricao: "Massa amanteigada com recheio cremoso de palmito", preco: "5.50", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "un" },
    { nome: "Café Expresso", slug: "cafe-expresso", categoriaSlug: "bebidas", descricao: "Café 100% arábica, torra média", preco: "4.50", estoqueAtual: "999", estoqueMinimo: "0", unidadeMedida: "un" },
    { nome: "Suco de Laranja Natural", slug: "suco-laranja", categoriaSlug: "bebidas", descricao: "Laranja pera espremida na hora, 300ml", preco: "8.00", estoqueAtual: "30", estoqueMinimo: "3", unidadeMedida: "un" },
  ],
};

import type { SegmentSeed } from "./types";

export const restauranteSeed: SegmentSeed = {
  categorias: [
    { nome: "Entradas", slug: "entradas", descricao: "Aperitivos e entradas", icone: "🥗", ordem: 1 },
    { nome: "Pratos Principais", slug: "pratos-principais", descricao: "Nossos pratos executivos e à la carte", icone: "🍽️", ordem: 2 },
    { nome: "Massas", slug: "massas", descricao: "Massas frescas com molhos variados", icone: "🍝", ordem: 3 },
    { nome: "Bebidas", slug: "bebidas", descricao: "Vinhos, refrigerantes, sucos e drinks", icone: "🍷", ordem: 4 },
    { nome: "Sobremesas", slug: "sobremesas", descricao: "Sobremesas da casa", icone: "🍰", ordem: 5 },
  ],
  produtos: [
    { nome: "Carpaccio", slug: "carpaccio", categoriaSlug: "entradas", descricao: "Fatias finas de carne com molho e parmesão", preco: "42.00", estoqueAtual: "15", estoqueMinimo: "3", unidadeMedida: "porcao" },
    { nome: "Bruschetta", slug: "bruschetta", categoriaSlug: "entradas", descricao: "Pão italiano com tomate, manjericão e azeite", preco: "28.00", estoqueAtual: "20", estoqueMinimo: "5", unidadeMedida: "porcao", destaque: true },
    { nome: "Filé Mignon ao Molho Madeira", slug: "file-madeira", categoriaSlug: "pratos-principais", descricao: "Filé grelhado com molho madeira, arroz e batata rústica", preco: "78.00", estoqueAtual: "20", estoqueMinimo: "5", unidadeMedida: "porcao", destaque: true },
    { nome: "Salmão Grelhado", slug: "salmao-grelhado", categoriaSlug: "pratos-principais", descricao: "Salmão com legumes salteados e arroz de brócolis", preco: "89.00", estoqueAtual: "15", estoqueMinimo: "3", unidadeMedida: "porcao" },
    { nome: "Espaguete à Carbonara", slug: "carbonara", categoriaSlug: "massas", descricao: "Espaguete fresco, bacon, ovo e parmesão", preco: "52.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "porcao", destaque: true },
    { nome: "Fettuccine ao Molho Branco", slug: "fettuccine-branco", categoriaSlug: "massas", descricao: "Fettuccine com molho branco, frango e champignon", preco: "48.00", estoqueAtual: "25", estoqueMinimo: "5", unidadeMedida: "porcao" },
    { nome: "Taça de Vinho", slug: "taca-vinho", categoriaSlug: "bebidas", descricao: "Taça de vinho tinto ou branco da casa", preco: "22.00", estoqueAtual: "100", estoqueMinimo: "10", unidadeMedida: "un" },
    { nome: "Água Mineral 500ml", slug: "agua-500", categoriaSlug: "bebidas", descricao: "Com ou sem gás", preco: "6.00", estoqueAtual: "80", estoqueMinimo: "20", unidadeMedida: "ml" },
    { nome: "Petit Gâteau", slug: "petit-gateau", categoriaSlug: "sobremesas", descricao: "Bolo quente de chocolate com sorvete de creme", preco: "28.00", estoqueAtual: "20", estoqueMinimo: "5", unidadeMedida: "un", destaque: true },
  ],
};

import { hash } from "bcryptjs";
import { db } from "./index";
import {
  categorias,
  configuracoesSistema,
  produtos,
  usuarios,
} from "./schema";

async function main() {
  console.log("🌱 Seed iniciado...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@reidospaes.com.br";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const senhaHash = await hash(adminPassword, 10);

  await db
    .insert(usuarios)
    .values({
      nome: "Administrador",
      email: adminEmail,
      senhaHash,
      perfil: "admin",
    })
    .onConflictDoNothing({ target: usuarios.email });
  console.log(`👤 Admin: ${adminEmail} / senha: ${adminPassword}`);

  const categoriasIniciais = [
    {
      nome: "Pães",
      slug: "paes",
      descricao: "Pães artesanais fresquinhos todos os dias",
      icone: "🥖",
      ordem: 1,
    },
    {
      nome: "Doces e Confeitaria",
      slug: "doces",
      descricao: "Bolos, tortas e doces feitos com carinho",
      icone: "🍰",
      ordem: 2,
    },
    {
      nome: "Salgados",
      slug: "salgados",
      descricao: "Salgados assados e fritos, prontinhos",
      icone: "🥐",
      ordem: 3,
    },
    {
      nome: "Bolos",
      slug: "bolos",
      descricao: "Bolos caseiros e especiais para festas",
      icone: "🎂",
      ordem: 4,
    },
    {
      nome: "Bebidas",
      slug: "bebidas",
      descricao: "Cafés, sucos e refrigerantes",
      icone: "☕",
      ordem: 5,
    },
    {
      nome: "Encomendas",
      slug: "encomendas",
      descricao: "Produtos por encomenda para eventos",
      icone: "🎁",
      ordem: 6,
    },
  ];

  for (const cat of categoriasIniciais) {
    await db.insert(categorias).values(cat).onConflictDoNothing();
  }
  console.log(`📂 ${categoriasIniciais.length} categorias inseridas`);

  const catPaes = await db.query.categorias.findFirst({
    where: (c, { eq }) => eq(c.slug, "paes"),
  });
  const catDoces = await db.query.categorias.findFirst({
    where: (c, { eq }) => eq(c.slug, "doces"),
  });
  const catSalgados = await db.query.categorias.findFirst({
    where: (c, { eq }) => eq(c.slug, "salgados"),
  });
  const catBebidas = await db.query.categorias.findFirst({
    where: (c, { eq }) => eq(c.slug, "bebidas"),
  });

  const produtosIniciais = [
    {
      nome: "Pão Francês",
      slug: "pao-frances",
      categoriaId: catPaes!.id,
      descricao: "O clássico pãozinho crocante por fora e macio por dentro",
      preco: "0.80",
      estoqueAtual: "200",
      estoqueMinimo: "20",
      unidadeMedida: "un" as const,
      pesoGramas: 50,
      destaque: true,
    },
    {
      nome: "Pão de Forma Integral",
      slug: "pao-forma-integral",
      categoriaId: catPaes!.id,
      descricao: "Pão integral caseiro, grãos selecionados",
      preco: "14.90",
      estoqueAtual: "15",
      estoqueMinimo: "3",
      unidadeMedida: "un" as const,
      pesoGramas: 500,
    },
    {
      nome: "Pão de Queijo",
      slug: "pao-de-queijo",
      categoriaId: catPaes!.id,
      descricao: "Queijo minas especial, receita da vovó",
      preco: "3.50",
      estoqueAtual: "80",
      estoqueMinimo: "10",
      unidadeMedida: "un" as const,
      pesoGramas: 45,
      destaque: true,
    },
    {
      nome: "Bolo de Chocolate",
      slug: "bolo-de-chocolate",
      categoriaId: catDoces!.id,
      descricao: "Bolo de chocolate com recheio e cobertura",
      preco: "7.50",
      estoqueAtual: "12",
      estoqueMinimo: "2",
      unidadeMedida: "fatia" as const,
      destaque: true,
    },
    {
      nome: "Brigadeiro Gourmet",
      slug: "brigadeiro-gourmet",
      categoriaId: catDoces!.id,
      descricao: "Brigadeiro feito com chocolate belga",
      preco: "4.00",
      estoqueAtual: "40",
      estoqueMinimo: "5",
      unidadeMedida: "un" as const,
    },
    {
      nome: "Coxinha de Frango",
      slug: "coxinha-frango",
      categoriaId: catSalgados!.id,
      descricao: "Recheada com frango desfiado e catupiry",
      preco: "6.50",
      estoqueAtual: "30",
      estoqueMinimo: "5",
      unidadeMedida: "un" as const,
      pesoGramas: 120,
      destaque: true,
    },
    {
      nome: "Empada de Palmito",
      slug: "empada-palmito",
      categoriaId: catSalgados!.id,
      descricao: "Massa amanteigada com recheio cremoso de palmito",
      preco: "5.50",
      estoqueAtual: "25",
      estoqueMinimo: "5",
      unidadeMedida: "un" as const,
    },
    {
      nome: "Café Expresso",
      slug: "cafe-expresso",
      categoriaId: catBebidas!.id,
      descricao: "Café 100% arábica, torra média",
      preco: "4.50",
      estoqueAtual: "999",
      estoqueMinimo: "0",
      unidadeMedida: "un" as const,
    },
    {
      nome: "Suco de Laranja Natural",
      slug: "suco-laranja",
      categoriaId: catBebidas!.id,
      descricao: "Laranja pera espremida na hora, 300ml",
      preco: "8.00",
      estoqueAtual: "30",
      estoqueMinimo: "3",
      unidadeMedida: "un" as const,
    },
  ];

  for (const p of produtosIniciais) {
    await db.insert(produtos).values(p).onConflictDoNothing();
  }
  console.log(`🥖 ${produtosIniciais.length} produtos inseridos`);

  const configs = [
    { chave: "nome_estabelecimento", valor: "Panificadora Rei dos Pães" },
    { chave: "endereco", valor: "Rua Exemplo, 123 - Centro" },
    { chave: "telefone", valor: "(11) 99999-9999" },
    { chave: "whatsapp", valor: "5511999999999" },
    { chave: "instagram", valor: "@reidospaes" },
    { chave: "horario_funcionamento", valor: "Seg a Sáb: 6h às 20h · Dom: 7h às 13h" },
    { chave: "taxa_gorjeta_padrao", valor: "10", tipo: "numero" },
    { chave: "cor_primaria", valor: "#b8802f" },
  ];

  for (const c of configs) {
    await db.insert(configuracoesSistema).values(c).onConflictDoNothing();
  }
  console.log(`⚙️  ${configs.length} configurações inseridas`);

  console.log("✅ Seed concluído!");
}

main()
  .catch((err) => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));

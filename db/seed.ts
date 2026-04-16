import { hash } from "bcryptjs";
import { db } from "./index";
import { categorias, configuracoesSistema, produtos, usuarios } from "./schema";
import { getSeedForSegmento } from "./seeds";
import type { Segmento } from "@/lib/config/tenant";

const VALID_SEGMENTOS: Segmento[] = [
  "panificadora",
  "churrascaria",
  "lanchonete",
  "restaurante",
  "pizzaria",
  "cafeteria",
  "generico",
];

function resolveSegmento(): Segmento {
  const envSegmento = (process.env.SEGMENTO ??
    process.env.NEXT_PUBLIC_TENANT_SEGMENTO ??
    "panificadora") as Segmento;
  if (!VALID_SEGMENTOS.includes(envSegmento)) {
    console.warn(
      `⚠️  Segmento "${envSegmento}" inválido — usando "generico" como fallback`
    );
    return "generico";
  }
  return envSegmento;
}

async function main() {
  const segmento = resolveSegmento();
  const nomeEstabelecimento =
    process.env.NEXT_PUBLIC_TENANT_NOME ?? "Estabelecimento";

  console.log(`🌱 Seed iniciado (segmento: ${segmento})...`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@estabelecimento.com";
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

  const seed = getSeedForSegmento(segmento);

  for (const cat of seed.categorias) {
    await db.insert(categorias).values(cat).onConflictDoNothing();
  }
  console.log(`📂 ${seed.categorias.length} categorias inseridas`);

  const categoriaBySlug = new Map<string, number>();
  for (const cat of seed.categorias) {
    const row = await db.query.categorias.findFirst({
      where: (c, { eq }) => eq(c.slug, cat.slug),
    });
    if (row) categoriaBySlug.set(cat.slug, row.id);
  }

  for (const p of seed.produtos) {
    const categoriaId = categoriaBySlug.get(p.categoriaSlug);
    if (!categoriaId) {
      console.warn(
        `⚠️  Produto "${p.nome}" ignorado: categoria "${p.categoriaSlug}" não encontrada`
      );
      continue;
    }
    await db
      .insert(produtos)
      .values({
        nome: p.nome,
        slug: p.slug,
        categoriaId,
        descricao: p.descricao,
        preco: p.preco,
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
        unidadeMedida: p.unidadeMedida,
        pesoGramas: p.pesoGramas,
        destaque: p.destaque,
      })
      .onConflictDoNothing();
  }
  console.log(`🛒 ${seed.produtos.length} produtos inseridos`);

  const configs = [
    { chave: "nome_estabelecimento", valor: nomeEstabelecimento },
    { chave: "segmento", valor: segmento },
    {
      chave: "endereco",
      valor: process.env.NEXT_PUBLIC_TENANT_RUA ?? "",
    },
    {
      chave: "telefone",
      valor: process.env.NEXT_PUBLIC_TENANT_TELEFONE ?? "",
    },
    {
      chave: "whatsapp",
      valor: process.env.NEXT_PUBLIC_TENANT_WHATSAPP ?? "",
    },
    {
      chave: "instagram",
      valor: process.env.NEXT_PUBLIC_TENANT_INSTAGRAM ?? "",
    },
    {
      chave: "horario_funcionamento",
      valor: "Seg a Sáb: 8h às 18h",
    },
    { chave: "taxa_gorjeta_padrao", valor: "10", tipo: "numero" },
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

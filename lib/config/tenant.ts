export type Segmento =
  | "panificadora"
  | "churrascaria"
  | "lanchonete"
  | "restaurante"
  | "pizzaria"
  | "cafeteria"
  | "generico";

export type TenantCores = {
  primaria: string;
  secundaria: string;
  acento: string;
};

export type TenantContato = {
  telefone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
};

export type TenantEndereco = {
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};

export type TenantConfig = {
  nome: string;
  slug: string;
  segmento: Segmento;
  subtitulo: string;
  cores: TenantCores;
  logoUrl: string;
  favicon: string;
  contato: TenantContato;
  endereco: TenantEndereco;
  metatags: {
    titulo: string;
    descricao: string;
  };
};

export const TENANT_CONFIG: TenantConfig = {
  nome: process.env.NEXT_PUBLIC_TENANT_NOME ?? "Panificadora Rei dos Pães",
  slug: process.env.NEXT_PUBLIC_TENANT_SLUG ?? "reidospaes",
  segmento:
    (process.env.NEXT_PUBLIC_TENANT_SEGMENTO as Segmento | undefined) ??
    "panificadora",
  subtitulo:
    process.env.NEXT_PUBLIC_TENANT_SUBTITULO ?? "Panificadora & Confeitaria",
  cores: {
    primaria: process.env.NEXT_PUBLIC_TENANT_COR_PRIMARIA ?? "#d97706",
    secundaria: process.env.NEXT_PUBLIC_TENANT_COR_SECUNDARIA ?? "#ea580c",
    acento: process.env.NEXT_PUBLIC_TENANT_COR_ACENTO ?? "#f59e0b",
  },
  logoUrl: process.env.NEXT_PUBLIC_TENANT_LOGO_URL ?? "/images/logo.png",
  favicon: process.env.NEXT_PUBLIC_TENANT_FAVICON ?? "/favicon.ico",
  contato: {
    telefone: process.env.NEXT_PUBLIC_TENANT_TELEFONE,
    whatsapp: process.env.NEXT_PUBLIC_TENANT_WHATSAPP,
    email: process.env.NEXT_PUBLIC_TENANT_EMAIL,
    instagram: process.env.NEXT_PUBLIC_TENANT_INSTAGRAM,
  },
  endereco: {
    rua: process.env.NEXT_PUBLIC_TENANT_RUA,
    numero: process.env.NEXT_PUBLIC_TENANT_NUMERO,
    bairro: process.env.NEXT_PUBLIC_TENANT_BAIRRO,
    cidade: process.env.NEXT_PUBLIC_TENANT_CIDADE,
    uf: process.env.NEXT_PUBLIC_TENANT_UF,
    cep: process.env.NEXT_PUBLIC_TENANT_CEP,
  },
  metatags: {
    titulo:
      process.env.NEXT_PUBLIC_TENANT_META_TITULO ??
      "Panificadora Rei dos Pães",
    descricao:
      process.env.NEXT_PUBLIC_TENANT_META_DESCRICAO ??
      "O melhor pão da cidade, feito com tradição e sabor.",
  },
};

export const SEGMENTOS: Record<
  Segmento,
  { label: string; substantivo: string }
> = {
  panificadora: { label: "Panificadora", substantivo: "panificadora" },
  churrascaria: { label: "Churrascaria", substantivo: "churrascaria" },
  lanchonete: { label: "Lanchonete", substantivo: "lanchonete" },
  restaurante: { label: "Restaurante", substantivo: "restaurante" },
  pizzaria: { label: "Pizzaria", substantivo: "pizzaria" },
  cafeteria: { label: "Cafeteria", substantivo: "cafeteria" },
  generico: { label: "Estabelecimento", substantivo: "estabelecimento" },
};

export function segmentoLabel(segmento: Segmento): string {
  return SEGMENTOS[segmento]?.label ?? SEGMENTOS.generico.label;
}

export function segmentoSubstantivo(segmento: Segmento): string {
  return SEGMENTOS[segmento]?.substantivo ?? SEGMENTOS.generico.substantivo;
}

export type HeroContent = {
  tagline: string;
  titulo: string;
  tituloDestaque: string;
  descricao: string;
  emojis: string[];
};

const HERO_DEFAULTS: Record<Segmento, HeroContent> = {
  panificadora: {
    tagline: "Fornada quente todo dia",
    titulo: "O rei do pão",
    tituloDestaque: "chegou fresquinho.",
    descricao:
      "Pães artesanais, bolos caseiros, doces finos e salgados irresistíveis.",
    emojis: ["👑", "🥖", "🥐", "🧁", "🔥"],
  },
  churrascaria: {
    tagline: "Na brasa todo dia",
    titulo: "Churrasco",
    tituloDestaque: "de verdade.",
    descricao:
      "Cortes nobres, tempero da casa e brasa no ponto. Tradição que se sente no sabor.",
    emojis: ["🔥", "🥩", "🍖", "🥗", "🍺"],
  },
  lanchonete: {
    tagline: "Sempre fresquinho pra você",
    titulo: "Seu lanche",
    tituloDestaque: "do jeito certo.",
    descricao:
      "Hambúrgueres artesanais, porções crocantes e milk-shakes cremosos. Feito na hora.",
    emojis: ["🍔", "🍟", "🥤", "🧀", "🔥"],
  },
  restaurante: {
    tagline: "Sabor em cada detalhe",
    titulo: "Gastronomia",
    tituloDestaque: "com alma.",
    descricao:
      "Ingredientes selecionados, preparo cuidadoso e pratos que contam histórias.",
    emojis: ["🍽️", "🍷", "🥗", "🍝", "✨"],
  },
  pizzaria: {
    tagline: "Massa fresca todo dia",
    titulo: "Pizza",
    tituloDestaque: "como deve ser.",
    descricao:
      "Massa artesanal, molho da casa e ingredientes premium. Direto do forno pra sua mesa.",
    emojis: ["🍕", "🧀", "🍅", "🫒", "🔥"],
  },
  cafeteria: {
    tagline: "Grãos especiais todo dia",
    titulo: "Café",
    tituloDestaque: "com personalidade.",
    descricao:
      "Espressos, métodos especiais, bolos caseiros e um ambiente que inspira.",
    emojis: ["☕", "🧁", "🥐", "🍵", "✨"],
  },
  generico: {
    tagline: "Qualidade todo dia",
    titulo: "Bem-vindo",
    tituloDestaque: "ao melhor da casa.",
    descricao:
      "Produtos selecionados, preparo cuidadoso e atendimento que faz a diferença.",
    emojis: ["⭐", "🛒", "🎯", "✨", "🔥"],
  },
};

export function getHeroContent(): HeroContent {
  const seg = TENANT_CONFIG.segmento;
  const defaults = HERO_DEFAULTS[seg] ?? HERO_DEFAULTS.generico;
  return {
    tagline:
      process.env.NEXT_PUBLIC_TENANT_HERO_TAGLINE ?? defaults.tagline,
    titulo:
      process.env.NEXT_PUBLIC_TENANT_HERO_TITULO ?? defaults.titulo,
    tituloDestaque:
      process.env.NEXT_PUBLIC_TENANT_HERO_TITULO_DESTAQUE ??
      defaults.tituloDestaque,
    descricao:
      process.env.NEXT_PUBLIC_TENANT_HERO_DESCRICAO ?? defaults.descricao,
    emojis: defaults.emojis,
  };
}

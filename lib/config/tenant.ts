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

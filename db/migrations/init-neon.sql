-- =============================================================
-- Panificadora Rei dos Pães — Schema inicial (Neon PostgreSQL)
-- Gerado a partir de db/schema.ts via drizzle-kit
-- Cole este arquivo inteiro no SQL Editor do Neon e execute.
-- =============================================================

-- -------- ENUMS --------
CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'debito', 'credito', 'pix', 'voucher', 'outro');
CREATE TYPE "public"."perfil_usuario" AS ENUM('admin', 'usuario');
CREATE TYPE "public"."status_caixa" AS ENUM('aberta', 'fechada');
CREATE TYPE "public"."status_comanda" AS ENUM('aberta', 'finalizada', 'cancelada');
CREATE TYPE "public"."tipo_movimentacao" AS ENUM('entrada', 'saida', 'ajuste');
CREATE TYPE "public"."unidade_medida" AS ENUM('un', 'kg', 'g', 'fatia', 'pacote');

-- -------- TABELAS --------

CREATE TABLE "usuarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "email" text NOT NULL,
  "senha_hash" text NOT NULL,
  "perfil" "perfil_usuario" DEFAULT 'usuario' NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);

CREATE TABLE "categorias" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "slug" text NOT NULL,
  "descricao" text,
  "icone" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "produtos" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "slug" text NOT NULL,
  "categoria_id" integer NOT NULL,
  "descricao" text,
  "preco" numeric(10, 2) NOT NULL,
  "estoque_atual" numeric(12, 3) DEFAULT '0' NOT NULL,
  "estoque_minimo" numeric(12, 3) DEFAULT '0' NOT NULL,
  "unidade_medida" "unidade_medida" DEFAULT 'un' NOT NULL,
  "peso_gramas" integer,
  "imagem_url" text,
  "imagens" jsonb DEFAULT '[]'::jsonb,
  "modelo_3d_url" text,
  "disponivel_hoje" boolean DEFAULT true NOT NULL,
  "destaque" boolean DEFAULT false NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "garcons" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "codigo" text NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "garcons_codigo_unique" UNIQUE("codigo")
);

CREATE TABLE "caixa_sessoes" (
  "id" serial PRIMARY KEY NOT NULL,
  "usuario_abertura_id" integer NOT NULL,
  "usuario_fechamento_id" integer,
  "valor_abertura" numeric(10, 2) DEFAULT '0' NOT NULL,
  "valor_fechamento" numeric(10, 2),
  "observacoes" text,
  "status" "status_caixa" DEFAULT 'aberta' NOT NULL,
  "data_abertura" timestamp with time zone DEFAULT now() NOT NULL,
  "data_fechamento" timestamp with time zone
);

CREATE TABLE "comandas" (
  "id" serial PRIMARY KEY NOT NULL,
  "numero" integer NOT NULL,
  "status" "status_comanda" DEFAULT 'aberta' NOT NULL,
  "valor_total" numeric(10, 2) DEFAULT '0' NOT NULL,
  "taxa_gorjeta" numeric(10, 2) DEFAULT '0' NOT NULL,
  "forma_pagamento" "forma_pagamento",
  "garcom_id" integer,
  "caixa_sessao_id" integer,
  "usuario_abertura_id" integer NOT NULL,
  "usuario_fechamento_id" integer,
  "observacoes" text,
  "data_abertura" timestamp with time zone DEFAULT now() NOT NULL,
  "data_fechamento" timestamp with time zone
);

CREATE TABLE "itens_comanda" (
  "id" serial PRIMARY KEY NOT NULL,
  "comanda_id" integer NOT NULL,
  "produto_id" integer NOT NULL,
  "quantidade" numeric(12, 3) NOT NULL,
  "preco_unitario" numeric(10, 2) NOT NULL,
  "subtotal" numeric(10, 2) NOT NULL,
  "observacao" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "itens_livres" (
  "id" serial PRIMARY KEY NOT NULL,
  "comanda_id" integer NOT NULL,
  "descricao" text NOT NULL,
  "quantidade" numeric(12, 3) NOT NULL,
  "preco_unitario" numeric(10, 2) NOT NULL,
  "subtotal" numeric(10, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "movimentacoes_estoque" (
  "id" serial PRIMARY KEY NOT NULL,
  "produto_id" integer NOT NULL,
  "tipo" "tipo_movimentacao" NOT NULL,
  "quantidade" numeric(12, 3) NOT NULL,
  "quantidade_anterior" numeric(12, 3) NOT NULL,
  "quantidade_posterior" numeric(12, 3) NOT NULL,
  "observacao" text,
  "comanda_id" integer,
  "usuario_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "perdas_estoque" (
  "id" serial PRIMARY KEY NOT NULL,
  "produto_id" integer NOT NULL,
  "quantidade" numeric(12, 3) NOT NULL,
  "valor" numeric(10, 2) NOT NULL,
  "motivo" text NOT NULL,
  "visualizada" boolean DEFAULT false NOT NULL,
  "usuario_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "comprovantes_venda" (
  "id" serial PRIMARY KEY NOT NULL,
  "comanda_id" integer NOT NULL,
  "conteudo" text NOT NULL,
  "tipo" text DEFAULT 'termico' NOT NULL,
  "impresso" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "configuracoes_sistema" (
  "chave" text NOT NULL,
  "valor" text,
  "tipo" text DEFAULT 'text' NOT NULL,
  "descricao" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "configuracoes_sistema_chave_pk" PRIMARY KEY("chave")
);

-- -------- FOREIGN KEYS --------

ALTER TABLE "produtos"
  ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk"
  FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id")
  ON DELETE restrict ON UPDATE no action;

ALTER TABLE "caixa_sessoes"
  ADD CONSTRAINT "caixa_sessoes_usuario_abertura_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_abertura_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "caixa_sessoes"
  ADD CONSTRAINT "caixa_sessoes_usuario_fechamento_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_fechamento_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_garcom_id_garcons_id_fk"
  FOREIGN KEY ("garcom_id") REFERENCES "public"."garcons"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_caixa_sessao_id_caixa_sessoes_id_fk"
  FOREIGN KEY ("caixa_sessao_id") REFERENCES "public"."caixa_sessoes"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_usuario_abertura_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_abertura_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "comandas"
  ADD CONSTRAINT "comandas_usuario_fechamento_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_fechamento_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "itens_comanda"
  ADD CONSTRAINT "itens_comanda_comanda_id_comandas_id_fk"
  FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "itens_comanda"
  ADD CONSTRAINT "itens_comanda_produto_id_produtos_id_fk"
  FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "itens_livres"
  ADD CONSTRAINT "itens_livres_comanda_id_comandas_id_fk"
  FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "movimentacoes_estoque"
  ADD CONSTRAINT "movimentacoes_estoque_produto_id_produtos_id_fk"
  FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "movimentacoes_estoque"
  ADD CONSTRAINT "movimentacoes_estoque_comanda_id_comandas_id_fk"
  FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "movimentacoes_estoque"
  ADD CONSTRAINT "movimentacoes_estoque_usuario_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "perdas_estoque"
  ADD CONSTRAINT "perdas_estoque_produto_id_produtos_id_fk"
  FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "perdas_estoque"
  ADD CONSTRAINT "perdas_estoque_usuario_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "comprovantes_venda"
  ADD CONSTRAINT "comprovantes_venda_comanda_id_comandas_id_fk"
  FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id")
  ON DELETE cascade ON UPDATE no action;

-- -------- ÍNDICES ÚNICOS --------

CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias" USING btree ("slug");
CREATE UNIQUE INDEX "produtos_slug_idx" ON "produtos" USING btree ("slug");

-- =============================================================
-- DADOS INICIAIS (seed)
-- =============================================================

-- Categorias
INSERT INTO "categorias" ("nome", "slug", "descricao", "icone", "ordem") VALUES
  ('Pães',                'paes',       'Pães artesanais fresquinhos todos os dias', '🥖', 1),
  ('Doces e Confeitaria', 'doces',      'Bolos, tortas e doces feitos com carinho',  '🍰', 2),
  ('Salgados',            'salgados',   'Salgados assados e fritos, prontinhos',     '🥐', 3),
  ('Bolos',               'bolos',      'Bolos caseiros e especiais para festas',    '🎂', 4),
  ('Bebidas',             'bebidas',    'Cafés, sucos e refrigerantes',              '☕', 5),
  ('Encomendas',          'encomendas', 'Produtos por encomenda para eventos',       '🎁', 6)
ON CONFLICT DO NOTHING;

-- Produtos (referenciam categorias por slug)
INSERT INTO "produtos"
  ("nome", "slug", "categoria_id", "descricao", "preco", "estoque_atual", "estoque_minimo", "unidade_medida", "peso_gramas", "destaque")
VALUES
  ('Pão Francês',            'pao-frances',          (SELECT id FROM categorias WHERE slug='paes'),     'O clássico pãozinho crocante por fora e macio por dentro', 0.80, 200, 20, 'un', 50, true),
  ('Pão de Forma Integral',  'pao-forma-integral',   (SELECT id FROM categorias WHERE slug='paes'),     'Pão integral caseiro, grãos selecionados',                14.90, 15,  3, 'un', 500, false),
  ('Pão de Queijo',          'pao-de-queijo',        (SELECT id FROM categorias WHERE slug='paes'),     'Queijo minas especial, receita da vovó',                   3.50, 80, 10, 'un', 45, true),
  ('Bolo de Chocolate',      'bolo-de-chocolate',    (SELECT id FROM categorias WHERE slug='doces'),    'Bolo de chocolate com recheio e cobertura',                7.50, 12,  2, 'fatia', NULL, true),
  ('Brigadeiro Gourmet',     'brigadeiro-gourmet',   (SELECT id FROM categorias WHERE slug='doces'),    'Brigadeiro feito com chocolate belga',                     4.00, 40,  5, 'un', NULL, false),
  ('Coxinha de Frango',      'coxinha-frango',       (SELECT id FROM categorias WHERE slug='salgados'), 'Recheada com frango desfiado e catupiry',                  6.50, 30,  5, 'un', 120, true),
  ('Empada de Palmito',      'empada-palmito',       (SELECT id FROM categorias WHERE slug='salgados'), 'Massa amanteigada com recheio cremoso de palmito',         5.50, 25,  5, 'un', NULL, false),
  ('Café Expresso',          'cafe-expresso',        (SELECT id FROM categorias WHERE slug='bebidas'),  'Café 100% arábica, torra média',                           4.50, 999, 0, 'un', NULL, false),
  ('Suco de Laranja Natural','suco-laranja',         (SELECT id FROM categorias WHERE slug='bebidas'),  'Laranja pera espremida na hora, 300ml',                    8.00, 30,  3, 'un', NULL, false)
ON CONFLICT DO NOTHING;

-- Configurações (white-label)
INSERT INTO "configuracoes_sistema" ("chave", "valor", "tipo") VALUES
  ('nome_estabelecimento',    'Panificadora Rei dos Pães',        'text'),
  ('endereco',                'Rua Exemplo, 123 - Centro',        'text'),
  ('telefone',                '(11) 99999-9999',                  'text'),
  ('whatsapp',                '5511999999999',                    'text'),
  ('instagram',               '@reidospaes',                      'text'),
  ('horario_funcionamento',   'Seg a Sáb: 6h às 20h · Dom: 7h às 13h', 'text'),
  ('taxa_gorjeta_padrao',     '10',                               'numero'),
  ('cor_primaria',            '#b8802f',                          'text')
ON CONFLICT DO NOTHING;

-- =============================================================
-- USUÁRIO ADMIN
-- =============================================================
-- ATENÇÃO: não coloque a senha em texto puro aqui.
-- Rode `npm run db:seed` depois de configurar DATABASE_URL no .env.local
-- para criar o admin com senha hasheada (bcrypt).
--
-- Alternativamente, gere o hash localmente com o snippet abaixo:
--
--   node -e "require('bcryptjs').hash('SUA_SENHA', 10).then(console.log)"
--
-- E insira manualmente:
--
--   INSERT INTO usuarios (nome, email, senha_hash, perfil)
--   VALUES ('Administrador', 'admin@reidospaes.com.br', '<HASH_GERADO>', 'admin');

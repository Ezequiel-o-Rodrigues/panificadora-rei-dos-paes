CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'debito', 'credito', 'pix', 'voucher', 'outro');--> statement-breakpoint
CREATE TYPE "public"."perfil_usuario" AS ENUM('admin', 'usuario');--> statement-breakpoint
CREATE TYPE "public"."status_caixa" AS ENUM('aberta', 'fechada');--> statement-breakpoint
CREATE TYPE "public"."status_comanda" AS ENUM('aberta', 'finalizada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimentacao" AS ENUM('entrada', 'saida', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."unidade_medida" AS ENUM('un', 'kg', 'g', 'fatia', 'pacote');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "comprovantes_venda" (
	"id" serial PRIMARY KEY NOT NULL,
	"comanda_id" integer NOT NULL,
	"conteudo" text NOT NULL,
	"tipo" text DEFAULT 'termico' NOT NULL,
	"impresso" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracoes_sistema" (
	"chave" text NOT NULL,
	"valor" text,
	"tipo" text DEFAULT 'text' NOT NULL,
	"descricao" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracoes_sistema_chave_pk" PRIMARY KEY("chave")
);
--> statement-breakpoint
CREATE TABLE "garcons" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"codigo" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garcons_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "itens_livres" (
	"id" serial PRIMARY KEY NOT NULL,
	"comanda_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "caixa_sessoes" ADD CONSTRAINT "caixa_sessoes_usuario_abertura_id_usuarios_id_fk" FOREIGN KEY ("usuario_abertura_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixa_sessoes" ADD CONSTRAINT "caixa_sessoes_usuario_fechamento_id_usuarios_id_fk" FOREIGN KEY ("usuario_fechamento_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_garcom_id_garcons_id_fk" FOREIGN KEY ("garcom_id") REFERENCES "public"."garcons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_caixa_sessao_id_caixa_sessoes_id_fk" FOREIGN KEY ("caixa_sessao_id") REFERENCES "public"."caixa_sessoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_usuario_abertura_id_usuarios_id_fk" FOREIGN KEY ("usuario_abertura_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_usuario_fechamento_id_usuarios_id_fk" FOREIGN KEY ("usuario_fechamento_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovantes_venda" ADD CONSTRAINT "comprovantes_venda_comanda_id_comandas_id_fk" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_comanda" ADD CONSTRAINT "itens_comanda_comanda_id_comandas_id_fk" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_comanda" ADD CONSTRAINT "itens_comanda_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_livres" ADD CONSTRAINT "itens_livres_comanda_id_comandas_id_fk" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_comanda_id_comandas_id_fk" FOREIGN KEY ("comanda_id") REFERENCES "public"."comandas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_estoque" ADD CONSTRAINT "perdas_estoque_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perdas_estoque" ADD CONSTRAINT "perdas_estoque_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "produtos_slug_idx" ON "produtos" USING btree ("slug");
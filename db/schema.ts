import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const perfilEnum = pgEnum("perfil_usuario", ["admin", "usuario"]);
export const unidadeMedidaEnum = pgEnum("unidade_medida", [
  "un",
  "kg",
  "g",
  "fatia",
  "pacote",
  "porcao",
  "litro",
  "ml",
  "metro",
  "combo",
]);
export const statusComandaEnum = pgEnum("status_comanda", [
  "aberta",
  "finalizada",
  "cancelada",
]);
export const tipoMovimentacaoEnum = pgEnum("tipo_movimentacao", [
  "entrada",
  "saida",
  "ajuste",
]);
export const statusCaixaEnum = pgEnum("status_caixa", ["aberta", "fechada"]);
export const formaPagamentoEnum = pgEnum("forma_pagamento", [
  "dinheiro",
  "debito",
  "credito",
  "pix",
  "voucher",
  "outro",
]);

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  perfil: perfilEnum("perfil").notNull().default("usuario"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categorias = pgTable(
  "categorias",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    slug: text("slug").notNull(),
    descricao: text("descricao"),
    icone: text("icone"),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("categorias_slug_idx").on(t.slug),
  })
);

export const produtos = pgTable(
  "produtos",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    slug: text("slug").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id, { onDelete: "restrict" }),
    descricao: text("descricao"),
    preco: numeric("preco", { precision: 10, scale: 2 }).notNull(),
    custoUnitario: numeric("custo_unitario", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    estoqueAtual: numeric("estoque_atual", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    estoqueMinimo: numeric("estoque_minimo", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    estoqueMaximo: numeric("estoque_maximo", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    unidadeMedida: unidadeMedidaEnum("unidade_medida").notNull().default("un"),
    pesoGramas: integer("peso_gramas"),
    imagemUrl: text("imagem_url"),
    imagens: jsonb("imagens").$type<string[]>().default(sql`'[]'::jsonb`),
    modelo3dUrl: text("modelo_3d_url"),
    disponivelHoje: boolean("disponivel_hoje").notNull().default(true),
    destaque: boolean("destaque").notNull().default(false),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("produtos_slug_idx").on(t.slug),
  })
);

export const garcons = pgTable("garcons", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  codigo: text("codigo").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const caixaSessoes = pgTable("caixa_sessoes", {
  id: serial("id").primaryKey(),
  usuarioAberturaId: integer("usuario_abertura_id")
    .notNull()
    .references(() => usuarios.id),
  usuarioFechamentoId: integer("usuario_fechamento_id").references(
    () => usuarios.id
  ),
  valorAbertura: numeric("valor_abertura", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  valorFechamento: numeric("valor_fechamento", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  status: statusCaixaEnum("status").notNull().default("aberta"),
  dataAbertura: timestamp("data_abertura", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dataFechamento: timestamp("data_fechamento", { withTimezone: true }),
});

export const comandas = pgTable("comandas", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull(),
  status: statusComandaEnum("status").notNull().default("aberta"),
  valorTotal: numeric("valor_total", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  taxaGorjeta: numeric("taxa_gorjeta", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  formaPagamento: formaPagamentoEnum("forma_pagamento"),
  garcomId: integer("garcom_id").references(() => garcons.id),
  caixaSessaoId: integer("caixa_sessao_id").references(() => caixaSessoes.id),
  usuarioAberturaId: integer("usuario_abertura_id")
    .notNull()
    .references(() => usuarios.id),
  usuarioFechamentoId: integer("usuario_fechamento_id").references(
    () => usuarios.id
  ),
  observacoes: text("observacoes"),
  dataAbertura: timestamp("data_abertura", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dataFechamento: timestamp("data_fechamento", { withTimezone: true }),
});

export const itensComanda = pgTable("itens_comanda", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  produtoId: integer("produto_id")
    .notNull()
    .references(() => produtos.id),
  quantidade: numeric("quantidade", { precision: 12, scale: 3 }).notNull(),
  precoUnitario: numeric("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const itensLivres = pgTable("itens_livres", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  quantidade: numeric("quantidade", { precision: 12, scale: 3 }).notNull(),
  precoUnitario: numeric("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const movimentacoesEstoque = pgTable("movimentacoes_estoque", {
  id: serial("id").primaryKey(),
  produtoId: integer("produto_id")
    .notNull()
    .references(() => produtos.id),
  tipo: tipoMovimentacaoEnum("tipo").notNull(),
  quantidade: numeric("quantidade", { precision: 12, scale: 3 }).notNull(),
  quantidadeAnterior: numeric("quantidade_anterior", {
    precision: 12,
    scale: 3,
  }).notNull(),
  quantidadePosterior: numeric("quantidade_posterior", {
    precision: 12,
    scale: 3,
  }).notNull(),
  observacao: text("observacao"),
  comandaId: integer("comanda_id").references(() => comandas.id),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const perdasEstoque = pgTable("perdas_estoque", {
  id: serial("id").primaryKey(),
  produtoId: integer("produto_id")
    .notNull()
    .references(() => produtos.id),
  quantidade: numeric("quantidade", { precision: 12, scale: 3 }).notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  motivo: text("motivo").notNull(),
  visualizada: boolean("visualizada").notNull().default(false),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comprovantesVenda = pgTable("comprovantes_venda", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  conteudo: text("conteudo").notNull(),
  tipo: text("tipo").notNull().default("termico"),
  impresso: boolean("impresso").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pagamentosPix = pgTable("pagamentos_pix", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  mpPaymentId: text("mp_payment_id").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  qrCodeBase64: text("qr_code_base64").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  taxaGorjetaSnapshot: numeric("taxa_gorjeta_snapshot", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const configuracoesSistema = pgTable(
  "configuracoes_sistema",
  {
    chave: text("chave").notNull(),
    valor: text("valor"),
    tipo: text("tipo").notNull().default("text"),
    descricao: text("descricao"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chave] }),
  })
);

export const categoriasRelations = relations(categorias, ({ many }) => ({
  produtos: many(produtos),
}));

export const produtosRelations = relations(produtos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [produtos.categoriaId],
    references: [categorias.id],
  }),
  itens: many(itensComanda),
  movimentacoes: many(movimentacoesEstoque),
  perdas: many(perdasEstoque),
}));

export const comandasRelations = relations(comandas, ({ one, many }) => ({
  garcom: one(garcons, {
    fields: [comandas.garcomId],
    references: [garcons.id],
  }),
  caixaSessao: one(caixaSessoes, {
    fields: [comandas.caixaSessaoId],
    references: [caixaSessoes.id],
  }),
  usuarioAbertura: one(usuarios, {
    fields: [comandas.usuarioAberturaId],
    references: [usuarios.id],
    relationName: "usuarioAbertura",
  }),
  usuarioFechamento: one(usuarios, {
    fields: [comandas.usuarioFechamentoId],
    references: [usuarios.id],
    relationName: "usuarioFechamento",
  }),
  itens: many(itensComanda),
  itensLivres: many(itensLivres),
  comprovantes: many(comprovantesVenda),
}));

export const itensComandaRelations = relations(itensComanda, ({ one }) => ({
  comanda: one(comandas, {
    fields: [itensComanda.comandaId],
    references: [comandas.id],
  }),
  produto: one(produtos, {
    fields: [itensComanda.produtoId],
    references: [produtos.id],
  }),
}));

export const itensLivresRelations = relations(itensLivres, ({ one }) => ({
  comanda: one(comandas, {
    fields: [itensLivres.comandaId],
    references: [comandas.id],
  }),
}));

export const movimentacoesEstoqueRelations = relations(
  movimentacoesEstoque,
  ({ one }) => ({
    produto: one(produtos, {
      fields: [movimentacoesEstoque.produtoId],
      references: [produtos.id],
    }),
    usuario: one(usuarios, {
      fields: [movimentacoesEstoque.usuarioId],
      references: [usuarios.id],
    }),
    comanda: one(comandas, {
      fields: [movimentacoesEstoque.comandaId],
      references: [comandas.id],
    }),
  })
);

export const perdasEstoqueRelations = relations(perdasEstoque, ({ one }) => ({
  produto: one(produtos, {
    fields: [perdasEstoque.produtoId],
    references: [produtos.id],
  }),
  usuario: one(usuarios, {
    fields: [perdasEstoque.usuarioId],
    references: [usuarios.id],
  }),
}));

export const pagamentosPixRelations = relations(pagamentosPix, ({ one }) => ({
  comanda: one(comandas, {
    fields: [pagamentosPix.comandaId],
    references: [comandas.id],
  }),
}));

export const caixaSessoesRelations = relations(caixaSessoes, ({ one, many }) => ({
  usuarioAbertura: one(usuarios, {
    fields: [caixaSessoes.usuarioAberturaId],
    references: [usuarios.id],
    relationName: "caixaAbertura",
  }),
  usuarioFechamento: one(usuarios, {
    fields: [caixaSessoes.usuarioFechamentoId],
    references: [usuarios.id],
    relationName: "caixaFechamento",
  }),
  comandas: many(comandas),
}));

export type Usuario = typeof usuarios.$inferSelect;
export type NovoUsuario = typeof usuarios.$inferInsert;
export type Categoria = typeof categorias.$inferSelect;
export type NovaCategoria = typeof categorias.$inferInsert;
export type Produto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;
export type Comanda = typeof comandas.$inferSelect;
export type NovaComanda = typeof comandas.$inferInsert;
export type ItemComanda = typeof itensComanda.$inferSelect;
export type NovoItemComanda = typeof itensComanda.$inferInsert;
export type MovimentacaoEstoque = typeof movimentacoesEstoque.$inferSelect;
export type NovaMovimentacaoEstoque = typeof movimentacoesEstoque.$inferInsert;
export type CaixaSessao = typeof caixaSessoes.$inferSelect;
export type NovaCaixaSessao = typeof caixaSessoes.$inferInsert;
export type PagamentoPix = typeof pagamentosPix.$inferSelect;
export type NovoPagamentoPix = typeof pagamentosPix.$inferInsert;

import { z } from "zod";

export const produtoSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  categoriaId: z.coerce.number().int().positive("Selecione uma categoria"),
  descricao: z.string().optional(),
  preco: z.string().refine((v) => Number(v) > 0, "Preço deve ser maior que zero"),
  estoqueAtual: z.string().optional().default("0"),
  estoqueMinimo: z.string().optional().default("0"),
  unidadeMedida: z.enum(["un", "kg", "g", "fatia", "pacote"]).default("un"),
  pesoGramas: z.coerce.number().int().positive().optional().nullable(),
  disponivelHoje: z.boolean().default(true),
  destaque: z.boolean().default(false),
  ativo: z.boolean().default(true),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;

import { z } from "zod";

export const criarComandaSchema = z.object({
  garcomId: z.coerce.number().int().positive().optional().nullable(),
  observacoes: z.string().optional(),
});

export const adicionarItemSchema = z.object({
  produtoId: z.coerce.number().int().positive("Selecione um produto"),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero"),
});

export const adicionarItemLivreSchema = z.object({
  descricao: z.string().min(1, "Descrição obrigatória"),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.string().refine((v) => Number(v) > 0, "Preço obrigatório"),
});

export const finalizarComandaSchema = z.object({
  formaPagamento: z.enum(["dinheiro", "debito", "credito", "pix", "voucher", "outro"]),
  taxaGorjeta: z.string().default("0"),
});

export type CriarComandaFormData = z.infer<typeof criarComandaSchema>;
export type AdicionarItemFormData = z.infer<typeof adicionarItemSchema>;
export type AdicionarItemLivreFormData = z.infer<typeof adicionarItemLivreSchema>;
export type FinalizarComandaFormData = z.infer<typeof finalizarComandaSchema>;

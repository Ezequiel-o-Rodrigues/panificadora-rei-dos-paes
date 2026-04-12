import { z } from "zod";

export const entradaEstoqueSchema = z.object({
  produtoId: z.coerce.number().int().positive("Selecione um produto"),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  observacao: z.string().optional(),
});

export const inventarioItemSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  quantidadeContada: z.coerce.number().min(0, "Quantidade não pode ser negativa"),
});

export const inventarioSchema = z.object({
  itens: z.array(inventarioItemSchema).min(1, "Adicione pelo menos um item"),
});

export const perdaEstoqueSchema = z.object({
  produtoId: z.coerce.number().int().positive("Selecione um produto"),
  quantidade: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  motivo: z.string().min(1, "Informe o motivo da perda"),
});

export type EntradaEstoqueFormData = z.infer<typeof entradaEstoqueSchema>;
export type InventarioFormData = z.infer<typeof inventarioSchema>;
export type PerdaEstoqueFormData = z.infer<typeof perdaEstoqueSchema>;

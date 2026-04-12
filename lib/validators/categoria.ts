import { z } from "zod";

export const categoriaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  icone: z.string().optional(),
  ordem: z.coerce.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
});

export type CategoriaFormData = z.infer<typeof categoriaSchema>;

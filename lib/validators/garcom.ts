import { z } from "zod";

export const garcomSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  codigo: z.string().min(1, "Código obrigatório"),
  ativo: z.boolean().default(true),
});

export type GarcomFormData = z.infer<typeof garcomSchema>;

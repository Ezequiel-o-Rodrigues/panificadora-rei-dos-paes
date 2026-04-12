import { z } from "zod";

export const usuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  perfil: z.enum(["admin", "usuario"]).default("usuario"),
  ativo: z.boolean().default(true),
});

export const usuarioUpdateSchema = usuarioSchema.omit({ senha: true }).extend({
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
export type UsuarioUpdateFormData = z.infer<typeof usuarioUpdateSchema>;

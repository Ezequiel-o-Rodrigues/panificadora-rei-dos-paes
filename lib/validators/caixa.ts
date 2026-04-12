import { z } from "zod";

export const abrirCaixaSchema = z.object({
  valorAbertura: z.string().refine(
    (v) => Number(v) >= 0,
    "Valor de abertura deve ser zero ou positivo"
  ),
});

export const fecharCaixaSchema = z.object({
  valorFechamento: z.string().refine(
    (v) => Number(v) >= 0,
    "Valor de fechamento deve ser zero ou positivo"
  ),
  observacoes: z.string().optional(),
});

export type AbrirCaixaFormData = z.infer<typeof abrirCaixaSchema>;
export type FecharCaixaFormData = z.infer<typeof fecharCaixaSchema>;

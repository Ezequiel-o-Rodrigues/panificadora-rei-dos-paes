"use client";

import { useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Input, Textarea } from "@/components/admin";
import { abrirCaixa } from "../_actions";

const schema = z.object({
  valorAbertura: z.string().refine(
    (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0;
    },
    "Valor de abertura deve ser zero ou positivo",
  ),
  observacoes: z.string().optional(),
});

type AbrirCaixaForm = z.infer<typeof schema>;

export function AbrirCaixaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AbrirCaixaForm>({
    resolver: zodResolver(schema) as unknown as Resolver<AbrirCaixaForm>,
    defaultValues: {
      valorAbertura: "0",
      observacoes: "",
    },
  });

  function onSubmit(values: AbrirCaixaForm) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("valorAbertura", values.valorAbertura);
      formData.set("observacoes", values.observacoes ?? "");

      const result = await abrirCaixa(formData);
      if (result.success && result.data) {
        toast.success("Caixa aberto com sucesso!");
        router.push(`/admin/caixa/${result.data.sessaoId}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao abrir caixa");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Valor de abertura (R$)"
        type="number"
        step="0.01"
        min="0"
        placeholder="0,00"
        hint="Valor inicial (troco) disponível na gaveta."
        error={errors.valorAbertura?.message}
        {...register("valorAbertura")}
      />

      <Textarea
        label="Observações"
        placeholder="Notas sobre a abertura do caixa (opcional)"
        error={errors.observacoes?.message}
        {...register("observacoes")}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="lg" loading={isPending}>
          Abrir Caixa
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/caixa")}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

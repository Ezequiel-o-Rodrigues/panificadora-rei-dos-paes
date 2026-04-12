"use client";

import { useMemo, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  entradaEstoqueSchema,
  type EntradaEstoqueFormData,
} from "@/lib/validators/estoque";
import { Select, Input, Textarea, Button } from "@/components/admin";
import { registrarEntrada } from "../../_actions";
import type { ProdutoEstoqueForm } from "../../_queries";

interface StockEntryFormProps {
  produtos: ProdutoEstoqueForm[];
}

function formatEstoque(valor: string | number, unidade: string): string {
  const n = Number(valor);
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${unidade}`;
}

export function StockEntryForm({ produtos }: StockEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EntradaEstoqueFormData>({
    resolver: zodResolver(
      entradaEstoqueSchema,
    ) as unknown as Resolver<EntradaEstoqueFormData>,
    defaultValues: {
      produtoId: 0,
      quantidade: 0,
      observacao: "",
    },
  });

  const produtoIdWatched = watch("produtoId");
  const quantidadeWatched = watch("quantidade");

  const produtoSelecionado = useMemo(() => {
    if (!produtoIdWatched) return null;
    const id = Number(produtoIdWatched);
    return produtos.find((p) => p.id === id) ?? null;
  }, [produtoIdWatched, produtos]);

  const estoqueFinal = useMemo(() => {
    if (!produtoSelecionado) return null;
    const atual = Number(produtoSelecionado.estoqueAtual);
    const qtd = Number(quantidadeWatched ?? 0);
    if (Number.isNaN(qtd)) return atual;
    return atual + qtd;
  }, [produtoSelecionado, quantidadeWatched]);

  const produtoOptions = produtos.map((p) => ({
    value: String(p.id),
    label: `${p.nome} (${formatEstoque(p.estoqueAtual, p.unidadeMedida)})`,
  }));

  function onSubmit(data: EntradaEstoqueFormData) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("produtoId", String(data.produtoId));
      formData.set("quantidade", String(data.quantidade));
      formData.set("observacao", data.observacao ?? "");

      const result = await registrarEntrada(formData);

      if (result.success) {
        toast.success("Entrada registrada com sucesso!");
        reset({ produtoId: 0, quantidade: 0, observacao: "" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao registrar entrada.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Select
        label="Produto"
        placeholder="Selecione um produto"
        options={produtoOptions}
        error={errors.produtoId?.message}
        {...register("produtoId")}
      />

      {produtoSelecionado && (
        <div className="rounded-xl border border-onyx-800/70 bg-onyx-900/40 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-onyx-400">Estoque atual</span>
            <span className="font-semibold text-ivory-50">
              {formatEstoque(
                produtoSelecionado.estoqueAtual,
                produtoSelecionado.unidadeMedida,
              )}
            </span>
          </div>
          {estoqueFinal != null && Number(quantidadeWatched) > 0 && (
            <div className="mt-2 flex items-center justify-between border-t border-onyx-800/70 pt-2">
              <span className="text-onyx-400">Estoque após entrada</span>
              <span className="font-semibold text-emerald-400">
                {formatEstoque(
                  estoqueFinal,
                  produtoSelecionado.unidadeMedida,
                )}
              </span>
            </div>
          )}
        </div>
      )}

      <Input
        label="Quantidade"
        type="number"
        step="0.001"
        min="0"
        placeholder="0,000"
        error={errors.quantidade?.message}
        {...register("quantidade")}
      />

      <Textarea
        label="Observação (opcional)"
        placeholder="Ex.: Nota fiscal #1234, fornecedor XYZ..."
        error={errors.observacao?.message}
        {...register("observacao")}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          Registrar entrada
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/estoque")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

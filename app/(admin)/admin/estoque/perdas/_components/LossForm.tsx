"use client";

import { useMemo, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  perdaEstoqueSchema,
  type PerdaEstoqueFormData,
} from "@/lib/validators/estoque";
import { Select, Input, Textarea, Button, DialogFooter } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { registrarPerda } from "../../_actions";
import type { ProdutoEstoqueForm } from "../../_queries";

interface LossFormProps {
  produtos: ProdutoEstoqueForm[];
  onSuccess: () => void;
  onCancel: () => void;
}

function formatEstoque(valor: string | number, unidade: string): string {
  const n = Number(valor);
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${unidade}`;
}

export function LossForm({ produtos, onSuccess, onCancel }: LossFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PerdaEstoqueFormData>({
    resolver: zodResolver(
      perdaEstoqueSchema,
    ) as unknown as Resolver<PerdaEstoqueFormData>,
    defaultValues: {
      produtoId: 0,
      quantidade: 0,
      motivo: "",
    },
  });

  const produtoIdWatched = watch("produtoId");
  const quantidadeWatched = watch("quantidade");

  const produtoSelecionado = useMemo(() => {
    if (!produtoIdWatched) return null;
    const id = Number(produtoIdWatched);
    return produtos.find((p) => p.id === id) ?? null;
  }, [produtoIdWatched, produtos]);

  const valorPerdaPreview = useMemo(() => {
    if (!produtoSelecionado) return 0;
    const qtd = Number(quantidadeWatched ?? 0);
    if (Number.isNaN(qtd) || qtd <= 0) return 0;
    return qtd * Number(produtoSelecionado.preco);
  }, [produtoSelecionado, quantidadeWatched]);

  const produtoOptions = produtos.map((p) => ({
    value: String(p.id),
    label: `${p.nome} (${formatEstoque(p.estoqueAtual, p.unidadeMedida)})`,
  }));

  function onSubmit(data: PerdaEstoqueFormData) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("produtoId", String(data.produtoId));
      formData.set("quantidade", String(data.quantidade));
      formData.set("motivo", data.motivo);

      const result = await registrarPerda(formData);

      if (result.success) {
        onSuccess();
      } else {
        toast.error(result.error ?? "Erro ao registrar perda.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Produto"
        placeholder="Selecione um produto"
        options={produtoOptions}
        error={errors.produtoId?.message}
        {...register("produtoId")}
      />

      <Input
        label="Quantidade"
        type="number"
        step="0.001"
        min="0"
        placeholder="0,000"
        error={errors.quantidade?.message}
        {...register("quantidade")}
      />

      {produtoSelecionado && valorPerdaPreview > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-rust-500/30 bg-rust-500/10 px-4 py-3 text-sm">
          <span className="text-onyx-300">Valor estimado da perda</span>
          <span className="font-semibold text-rust-300">
            {formatBRL(valorPerdaPreview)}
          </span>
        </div>
      )}

      <Textarea
        label="Motivo"
        placeholder="Ex.: Quebra durante manipulação, validade expirada..."
        error={errors.motivo?.message}
        {...register("motivo")}
      />

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="danger" loading={isPending}>
          Registrar Perda
        </Button>
      </DialogFooter>
    </form>
  );
}

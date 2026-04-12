"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Dialog, DialogFooter, Input } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { adicionarItemLivre } from "../_actions";

interface ItemLivreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandaId: number;
}

export function ItemLivreDialog({
  open,
  onOpenChange,
  comandaId,
}: ItemLivreDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [preco, setPreco] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescricao("");
      setQuantidade("1");
      setPreco("");
      setError(null);
    }
  }, [open]);

  const qtdNum = Number(quantidade);
  const precoNum = Number(preco);
  const subtotal =
    Number.isFinite(qtdNum) && Number.isFinite(precoNum)
      ? qtdNum * precoNum
      : 0;

  function handleConfirm() {
    if (!descricao.trim()) {
      setError("Informe a descrição");
      return;
    }
    if (!Number.isFinite(qtdNum) || qtdNum <= 0) {
      setError("Quantidade inválida");
      return;
    }
    if (!Number.isFinite(precoNum) || precoNum <= 0) {
      setError("Preço inválido");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("descricao", descricao.trim());
      formData.set("quantidade", String(qtdNum));
      formData.set("precoUnitario", precoNum.toFixed(2));

      const result = await adicionarItemLivre(comandaId, formData);
      if (result.success) {
        toast.success("Item livre adicionado");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao adicionar item");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Item livre"
      description="Adicione um item sem cadastro de produto"
    >
      <div className="space-y-4">
        <Input
          label="Descrição"
          placeholder="Ex: Serviço de entrega"
          autoFocus
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            setError(null);
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantidade"
            type="number"
            step="0.001"
            min="0.001"
            value={quantidade}
            onChange={(e) => {
              setQuantidade(e.target.value);
              setError(null);
            }}
          />
          <Input
            label="Preço unitário (R$)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            value={preco}
            onChange={(e) => {
              setPreco(e.target.value);
              setError(null);
            }}
          />
        </div>

        {error && <p className="text-xs text-rust-400">{error}</p>}

        <div className="flex items-center justify-between rounded-xl border border-flame-500/30 bg-flame-500/5 p-3 text-sm">
          <span className="font-semibold text-onyx-200">Subtotal</span>
          <span className="text-lg font-bold text-flame-400">
            {formatBRL(subtotal)}
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button onClick={handleConfirm} loading={isPending}>
          Adicionar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

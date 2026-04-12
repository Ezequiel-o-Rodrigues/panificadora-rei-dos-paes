"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, DialogFooter, Input } from "@/components/admin";
import { formatBRL } from "@/lib/money";

interface QuantidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: {
    id: number;
    nome: string;
    preco: string;
    estoqueAtual: string;
    unidadeMedida: string;
  };
  onConfirm: (quantidade: number) => void;
  loading?: boolean;
}

export function QuantidadeDialog({
  open,
  onOpenChange,
  produto,
  onConfirm,
  loading,
}: QuantidadeDialogProps) {
  const [quantidade, setQuantidade] = useState("1");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantidade("1");
      setError(null);
    }
  }, [open]);

  const estoque = Number(produto.estoqueAtual);
  const qtdNum = Number(quantidade);
  const subtotal = Number.isFinite(qtdNum) ? qtdNum * Number(produto.preco) : 0;

  function handleConfirm() {
    const n = Number(quantidade);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Quantidade inválida");
      return;
    }
    if (n > estoque) {
      setError(
        `Estoque insuficiente (disponível: ${estoque.toFixed(3)} ${produto.unidadeMedida})`,
      );
      return;
    }
    onConfirm(n);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar produto"
      description={produto.nome}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-onyx-800 bg-onyx-800/40 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-onyx-300">Preço unitário</span>
            <span className="font-semibold text-ivory-50">
              {formatBRL(produto.preco)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-onyx-400">Estoque disponível</span>
            <span className="text-onyx-300">
              {estoque.toFixed(3)} {produto.unidadeMedida}
            </span>
          </div>
        </div>

        <Input
          label={`Quantidade (${produto.unidadeMedida})`}
          type="number"
          step="0.001"
          min="0.001"
          autoFocus
          value={quantidade}
          onChange={(e) => {
            setQuantidade(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirm();
            }
          }}
          error={error ?? undefined}
        />

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
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button onClick={handleConfirm} loading={loading} size="lg">
          Adicionar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

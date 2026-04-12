"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogFooter,
  Input,
  Textarea,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { calcDiferencaCaixa } from "@/lib/calculations";
import { fecharCaixa } from "../_actions";
import type { ResumoSessao } from "../_queries";

interface FecharCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessao: {
    id: number;
    valorAbertura: string;
  };
  resumo: ResumoSessao;
  comandasAbertasCount: number;
}

export function FecharCaixaDialog({
  open,
  onOpenChange,
  sessao,
  resumo,
  comandasAbertasCount,
}: FecharCaixaDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const valorEsperado = useMemo(
    () => Number(sessao.valorAbertura) + resumo.vendasDinheiro,
    [sessao.valorAbertura, resumo.vendasDinheiro],
  );

  const [valorFechamento, setValorFechamento] = useState(
    valorEsperado.toFixed(2),
  );
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open) {
      setValorFechamento(valorEsperado.toFixed(2));
      setObservacoes("");
    }
  }, [open, valorEsperado]);

  const diferenca = useMemo(
    () => Number(calcDiferencaCaixa(valorFechamento, valorEsperado)),
    [valorFechamento, valorEsperado],
  );

  const totalCartao =
    (resumo.vendasPorFormaPagamento.debito?.total ?? 0) +
    (resumo.vendasPorFormaPagamento.credito?.total ?? 0);
  const totalPix = resumo.vendasPorFormaPagamento.pix?.total ?? 0;
  const totalVoucher = resumo.vendasPorFormaPagamento.voucher?.total ?? 0;
  const totalOutro = resumo.vendasPorFormaPagamento.outro?.total ?? 0;

  function handleConfirm() {
    if (comandasAbertasCount > 0) {
      toast.error(
        `Existem ${comandasAbertasCount} comanda(s) em aberto. Finalize ou cancele antes de fechar o caixa.`,
      );
      return;
    }

    const n = Number(valorFechamento);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Valor de fechamento inválido");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("valorFechamento", n.toFixed(2));
      formData.set("observacoes", observacoes);

      const result = await fecharCaixa(sessao.id, formData);
      if (result.success) {
        toast.success("Caixa fechado com sucesso!");
        onOpenChange(false);
        router.push("/admin/caixa");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao fechar caixa");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fechar Caixa"
      description={`Resumo e conferência da sessão #${sessao.id}`}
      className="max-w-xl"
    >
      <div className="space-y-4">
        {comandasAbertasCount > 0 && (
          <div className="rounded-xl border border-rust-500/40 bg-rust-500/10 p-3 text-sm text-rust-300">
            Existem <strong>{comandasAbertasCount}</strong> comanda(s) em
            aberto. Finalize ou cancele antes de fechar o caixa.
          </div>
        )}

        <div className="rounded-xl border border-onyx-800 bg-onyx-800/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-onyx-400">
            Resumo da sessão
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-onyx-300">
              <dt>Valor de abertura</dt>
              <dd>{formatBRL(sessao.valorAbertura)}</dd>
            </div>
            <div className="flex justify-between text-onyx-300">
              <dt>Total de comandas</dt>
              <dd>{resumo.totalComandas}</dd>
            </div>
            <div className="flex justify-between text-onyx-300">
              <dt>Total de vendas</dt>
              <dd className="font-semibold text-ivory-100">
                {formatBRL(resumo.totalVendas)}
              </dd>
            </div>
            {resumo.totalGorjetas > 0 && (
              <div className="flex justify-between text-onyx-300">
                <dt>Gorjetas</dt>
                <dd>{formatBRL(resumo.totalGorjetas)}</dd>
              </div>
            )}
            <div className="my-2 border-t border-onyx-800" />
            <div className="flex justify-between text-onyx-300">
              <dt>Dinheiro</dt>
              <dd>{formatBRL(resumo.vendasDinheiro)}</dd>
            </div>
            <div className="flex justify-between text-onyx-300">
              <dt>Cartão</dt>
              <dd>{formatBRL(totalCartao)}</dd>
            </div>
            <div className="flex justify-between text-onyx-300">
              <dt>PIX</dt>
              <dd>{formatBRL(totalPix)}</dd>
            </div>
            {totalVoucher > 0 && (
              <div className="flex justify-between text-onyx-300">
                <dt>Voucher</dt>
                <dd>{formatBRL(totalVoucher)}</dd>
              </div>
            )}
            {totalOutro > 0 && (
              <div className="flex justify-between text-onyx-300">
                <dt>Outro</dt>
                <dd>{formatBRL(totalOutro)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-flame-500/30 bg-flame-500/5 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-onyx-300">Valor esperado em gaveta</span>
            <span className="font-semibold text-ivory-50">
              {formatBRL(valorEsperado)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-onyx-400">
            (valor de abertura + vendas em dinheiro)
          </div>
        </div>

        <Input
          label="Valor em gaveta (contado)"
          type="number"
          step="0.01"
          min="0"
          value={valorFechamento}
          onChange={(e) => setValorFechamento(e.target.value)}
          disabled={isPending}
        />

        <div
          className={`rounded-xl border p-3 text-sm ${
            diferenca === 0
              ? "border-onyx-700 bg-onyx-800/40 text-onyx-300"
              : diferenca > 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rust-500/40 bg-rust-500/10 text-rust-400"
          }`}
        >
          <div className="flex justify-between">
            <span className="font-semibold">Diferença</span>
            <span className="font-bold">
              {diferenca >= 0 ? "+" : ""}
              {formatBRL(diferenca)}
            </span>
          </div>
          <div className="mt-1 text-[11px] opacity-80">
            {diferenca === 0
              ? "Gaveta bate com o esperado."
              : diferenca > 0
                ? "Sobra em caixa."
                : "Falta em caixa."}
          </div>
        </div>

        <Textarea
          label="Observações"
          placeholder="Notas sobre o fechamento (opcional)"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          disabled={isPending}
        />
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          loading={isPending}
          disabled={comandasAbertasCount > 0}
        >
          Confirmar Fechamento
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Printer,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Badge,
  Card,
  ConfirmDialog,
  Dialog,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { cancelarComanda, reimprimirComprovante } from "../_actions";
import type { ComandaDetalhada } from "../_queries";

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

type StatusVariant = "info" | "success" | "danger";

const STATUS_BADGE: Record<
  "aberta" | "finalizada" | "cancelada",
  { variant: StatusVariant; label: string }
> = {
  aberta: { variant: "info", label: "Aberta" },
  finalizada: { variant: "success", label: "Finalizada" },
  cancelada: { variant: "danger", label: "Cancelada" },
};

function formatQuantidade(qtd: string) {
  return Number(qtd).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

interface ComandaDetailProps {
  comanda: ComandaDetalhada;
}

export function ComandaDetail({ comanda }: ComandaDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptContent, setReceiptContent] = useState<string>("");

  const statusConfig = STATUS_BADGE[comanda.status];

  const totals = useMemo(() => {
    const valorTotal = Number(comanda.valorTotal);
    const gorjeta = Number(comanda.taxaGorjeta);
    const subtotal = valorTotal - gorjeta;
    return { valorTotal, gorjeta, subtotal };
  }, [comanda.valorTotal, comanda.taxaGorjeta]);

  function handleCancelar() {
    startTransition(async () => {
      const result = await cancelarComanda(comanda.id);
      if (result.success) {
        toast.success("Comanda cancelada com sucesso!");
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao cancelar comanda.");
      }
    });
  }

  function handleReimprimir() {
    startTransition(async () => {
      const result = await reimprimirComprovante(comanda.id);
      if (result.success && result.data) {
        setReceiptContent(result.data.content);
        setReceiptOpen(true);
        toast.success("Comprovante gerado!");
      } else if (!result.success) {
        toast.error(result.error ?? "Erro ao reimprimir comprovante.");
      }
    });
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão.");
      return;
    }
    printWindow.document.write(
      `<html><head><title>Comprovante #${comanda.numero}</title><style>
        body { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre; padding: 12px; }
      </style></head><body>${receiptContent
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/comandas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl font-bold text-ivory-50">
                Comanda #{String(comanda.numero).padStart(4, "0")}
              </h2>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-onyx-300">
              <span className="inline-flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-onyx-400" />
                Aberta em {formatDateTime(comanda.dataAbertura)}
              </span>
              {comanda.dataFechamento && (
                <span className="inline-flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-onyx-400" />
                  Fechada em {formatDateTime(comanda.dataFechamento)}
                </span>
              )}
              {comanda.garcom?.nome && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-onyx-400" />
                  {comanda.garcom.nome}
                </span>
              )}
              {comanda.caixaSessao && (
                <Link
                  href={`/admin/caixa/${comanda.caixaSessao.id}`}
                  className="inline-flex items-center gap-1.5 text-flame-400 hover:text-flame-300"
                >
                  <Wallet className="h-4 w-4" />
                  Sessão de caixa #{comanda.caixaSessao.id}
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {comanda.status === "aberta" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={isPending}
              >
                <Ban className="h-4 w-4" />
                Cancelar comanda
              </Button>
            )}
            {comanda.status === "finalizada" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReimprimir}
                loading={isPending}
              >
                <Printer className="h-4 w-4" />
                Reimprimir comprovante
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ivory-50">
            Itens
          </h3>
          <span className="text-xs text-onyx-400">
            {comanda.itens.length} produto(s)
          </span>
        </div>
        {comanda.itens.length === 0 ? (
          <p className="py-4 text-center text-sm text-onyx-400">
            Nenhum produto lançado nesta comanda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-onyx-800/70 text-left text-xs uppercase tracking-wider text-onyx-400">
                  <th className="px-2 py-2 font-semibold">Produto</th>
                  <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-2 py-2 text-right font-semibold">Preço un.</th>
                  <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-onyx-800/40">
                {comanda.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2 text-ivory-50">
                      <div className="font-medium">{item.produto.nome}</div>
                      {item.observacao && (
                        <div className="text-xs text-onyx-400">
                          {item.observacao}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-onyx-200">
                      {formatQuantidade(item.quantidade)}
                    </td>
                    <td className="px-2 py-2 text-right text-onyx-200">
                      {formatBRL(item.precoUnitario)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-ivory-50">
                      {formatBRL(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {comanda.itensLivres.length > 0 && (
        <Card className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-ivory-50">
            Itens livres
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-onyx-800/70 text-left text-xs uppercase tracking-wider text-onyx-400">
                  <th className="px-2 py-2 font-semibold">Descrição</th>
                  <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-2 py-2 text-right font-semibold">Preço un.</th>
                  <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-onyx-800/40">
                {comanda.itensLivres.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2 text-ivory-50">{item.descricao}</td>
                    <td className="px-2 py-2 text-right text-onyx-200">
                      {formatQuantidade(item.quantidade)}
                    </td>
                    <td className="px-2 py-2 text-right text-onyx-200">
                      {formatBRL(item.precoUnitario)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-ivory-50">
                      {formatBRL(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-ivory-50">
          Totais
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-onyx-300">
            <span>Subtotal</span>
            <span className="font-medium text-ivory-50">
              {formatBRL(totals.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-onyx-300">
            <span>Gorjeta</span>
            <span className="font-medium text-ivory-50">
              {formatBRL(totals.gorjeta)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-onyx-800/70 pt-2 text-base">
            <span className="font-semibold text-onyx-200">Total</span>
            <span className="font-display text-xl font-bold text-flame-400">
              {formatBRL(totals.valorTotal)}
            </span>
          </div>
          {comanda.status === "finalizada" && comanda.formaPagamento && (
            <div className="flex items-center justify-between border-t border-onyx-800/70 pt-2 text-onyx-300">
              <span>Forma de pagamento</span>
              <span className="font-medium text-ivory-50">
                {FORMA_PAGAMENTO_LABELS[comanda.formaPagamento] ??
                  comanda.formaPagamento}
              </span>
            </div>
          )}
        </div>
      </Card>

      {comanda.observacoes && (
        <Card>
          <h3 className="mb-2 font-display text-lg font-semibold text-ivory-50">
            Observações
          </h3>
          <p className="whitespace-pre-wrap text-sm text-onyx-200">
            {comanda.observacoes}
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancelar comanda"
        message={`Deseja realmente cancelar a comanda #${String(
          comanda.numero,
        ).padStart(
          4,
          "0",
        )}? Esta ação não pode ser desfeita e a comanda ficará marcada como cancelada.`}
        confirmLabel="Cancelar comanda"
        onConfirm={handleCancelar}
        loading={isPending}
      />

      <Dialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        title="Comprovante de venda"
        description={`Comanda #${String(comanda.numero).padStart(4, "0")}`}
      >
        <pre className="max-h-96 overflow-auto rounded-xl border border-onyx-800/70 bg-onyx-950/60 p-4 font-mono text-xs text-ivory-50">
          {receiptContent}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReceiptOpen(false)}>
            Fechar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

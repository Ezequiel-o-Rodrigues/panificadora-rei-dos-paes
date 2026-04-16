"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogFooter,
  Input,
  Select,
} from "@/components/admin";
import { ComprovantePreview } from "@/components/pagamento/ComprovantePreview";
import { PixQrCode } from "@/components/pagamento/PixQrCode";
import { formatBRL } from "@/lib/money";
import { isFeatureEnabled } from "@/lib/features";
import { finalizarComanda, iniciarPagamentoPix } from "../_actions";
import type { ConfigGorjeta } from "../_queries";

interface FinalizarComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandaId: number;
  subtotal: number;
  configGorjeta: ConfigGorjeta;
}

type PixState = {
  pagamentoId: number;
  qrCode: string;
  qrCodeBase64: string;
  valor: number;
  expiresAt: string;
};

const FORMA_PAGAMENTO_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Cartão Débito" },
  { value: "credito", label: "Cartão Crédito" },
  { value: "pix", label: "PIX" },
  { value: "voucher", label: "Voucher" },
  { value: "outro", label: "Outro" },
];

export function FinalizarComandaDialog({
  open,
  onOpenChange,
  comandaId,
  subtotal,
  configGorjeta,
}: FinalizarComandaDialogProps) {
  const [isPending, startTransition] = useTransition();

  const defaultPercent = configGorjeta.tipo === "percentual" ? configGorjeta.taxa : "0";
  const defaultFixa = configGorjeta.tipo === "fixa" ? configGorjeta.taxa : "0";

  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [gorjetaPercent, setGorjetaPercent] = useState<string>(defaultPercent);
  const [gorjetaValor, setGorjetaValor] = useState<string>(defaultFixa);
  const [gorjetaMode, setGorjetaMode] = useState<"percentual" | "valor">(
    configGorjeta.tipo === "fixa" ? "valor" : "percentual",
  );
  const [comprovanteConteudo, setComprovanteConteudo] = useState<string | null>(
    null,
  );
  const [pixState, setPixState] = useState<PixState | null>(null);

  useEffect(() => {
    if (open) {
      setFormaPagamento("dinheiro");
      setGorjetaPercent(defaultPercent);
      setGorjetaValor(defaultFixa);
      setGorjetaMode(configGorjeta.tipo === "fixa" ? "valor" : "percentual");
      setComprovanteConteudo(null);
      setPixState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const gorjetaCalculada = useMemo(() => {
    if (gorjetaMode === "percentual") {
      const pct = Number(gorjetaPercent);
      if (!Number.isFinite(pct) || pct < 0) return 0;
      return subtotal * (pct / 100);
    }
    const v = Number(gorjetaValor);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [gorjetaMode, gorjetaPercent, gorjetaValor, subtotal]);

  const total = subtotal + gorjetaCalculada;

  const pixEnabled = isFeatureEnabled("mercadopago_pix");
  const usarFluxoPix = pixEnabled && formaPagamento === "pix";

  function buildTaxaGorjeta(): string {
    return gorjetaMode === "percentual"
      ? gorjetaPercent || "0"
      : gorjetaCalculada.toFixed(2);
  }

  function handleConfirm() {
    if (subtotal <= 0) {
      toast.error("Comanda vazia");
      return;
    }

    if (usarFluxoPix) {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("taxaGorjeta", buildTaxaGorjeta());
        const result = await iniciarPagamentoPix(comandaId, formData);
        if (result.success && result.data) {
          setPixState({
            pagamentoId: result.data.pagamentoId,
            qrCode: result.data.qrCode,
            qrCodeBase64: result.data.qrCodeBase64,
            valor: result.data.valor,
            expiresAt: result.data.expiresAt,
          });
        } else {
          toast.error(result.error ?? "Erro ao gerar QR Code Pix");
        }
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("formaPagamento", formaPagamento);
      formData.set("taxaGorjeta", buildTaxaGorjeta());

      const result = await finalizarComanda(comandaId, formData);
      if (result.success) {
        toast.success("Comanda finalizada!");
        if (result.data?.conteudo) {
          setComprovanteConteudo(result.data.conteudo);
        } else {
          onOpenChange(false);
        }
      } else {
        toast.error(result.error ?? "Erro ao finalizar comanda");
      }
    });
  }

  if (comprovanteConteudo) {
    return (
      <ComprovantePreview
        open={open}
        onOpenChange={onOpenChange}
        conteudo={comprovanteConteudo}
        onClose={() => setComprovanteConteudo(null)}
      />
    );
  }

  if (pixState) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Pagamento via Pix"
        description="Escaneie o QR Code ou copie o código para pagar"
      >
        <PixQrCode
          pagamentoId={pixState.pagamentoId}
          qrCode={pixState.qrCode}
          qrCodeBase64={pixState.qrCodeBase64}
          valor={pixState.valor}
          expiresAt={pixState.expiresAt}
          onApproved={(conteudo) => {
            setPixState(null);
            setComprovanteConteudo(conteudo);
            toast.success("Pagamento Pix aprovado!");
          }}
          onCancel={() => {
            setPixState(null);
          }}
        />
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Finalizar Comanda"
      description="Informe a forma de pagamento e gorjeta"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-onyx-800 bg-onyx-800/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-onyx-300">Subtotal</span>
            <span className="font-semibold text-ivory-50">
              {formatBRL(subtotal)}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-sm font-medium text-onyx-200">Gorjeta</label>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGorjetaMode("percentual")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  gorjetaMode === "percentual"
                    ? "bg-flame-500/15 text-flame-300"
                    : "text-onyx-400 hover:text-ivory-50"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setGorjetaMode("valor")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  gorjetaMode === "valor"
                    ? "bg-flame-500/15 text-flame-300"
                    : "text-onyx-400 hover:text-ivory-50"
                }`}
              >
                R$
              </button>
            </div>
          </div>

          {gorjetaMode === "percentual" ? (
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="0"
              value={gorjetaPercent}
              onChange={(e) => setGorjetaPercent(e.target.value)}
              hint={`${formatBRL(gorjetaCalculada)} sobre o subtotal`}
            />
          ) : (
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={gorjetaValor}
              onChange={(e) => setGorjetaValor(e.target.value)}
            />
          )}
        </div>

        <Select
          label="Forma de pagamento"
          options={FORMA_PAGAMENTO_OPTIONS}
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value)}
        />

        <div className="rounded-xl border border-flame-500/30 bg-flame-500/5 p-4">
          <div className="flex items-center justify-between text-sm text-onyx-300">
            <span>Subtotal</span>
            <span>{formatBRL(subtotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm text-onyx-300">
            <span>Gorjeta</span>
            <span>{formatBRL(gorjetaCalculada)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-flame-500/20 pt-2">
            <span className="text-sm font-semibold text-ivory-100">Total</span>
            <span className="text-2xl font-bold text-flame-400">
              {formatBRL(total)}
            </span>
          </div>
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
        <Button onClick={handleConfirm} loading={isPending} size="lg">
          {usarFluxoPix ? "Gerar QR Code Pix" : "Confirmar Venda"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

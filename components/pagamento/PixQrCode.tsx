"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin";
import { verificarPagamentoPix } from "@/app/(admin)/admin/caixa/_actions";

interface PixQrCodeProps {
  pagamentoId: number;
  qrCode: string;
  qrCodeBase64: string;
  valor: number;
  expiresAt: string;
  onApproved: (conteudo: string) => void;
  onCancel: () => void;
}

const POLL_INTERVAL_MS = 4000;

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PixQrCode({
  pagamentoId,
  qrCode,
  qrCodeBase64,
  valor,
  expiresAt,
  onApproved,
  onCancel,
}: PixQrCodeProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "cancelled" | "rejected">(
    "pending",
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });
  const [isCopying, setIsCopying] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const countdown = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(countdown);
  }, [expiresAt]);

  useEffect(() => {
    if (status !== "pending") return;

    const poll = async () => {
      const result = await verificarPagamentoPix(pagamentoId);
      if (!result.success || !result.data) return;

      if (result.data.status === "approved") {
        setStatus("approved");
        if (result.data.conteudo) {
          onApproved(result.data.conteudo);
        }
      } else if (
        result.data.status === "cancelled" ||
        result.data.status === "rejected"
      ) {
        setStatus(result.data.status);
        toast.error("Pagamento não concluído.");
      }
    };

    poll();
    pollTimer.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [status, pagamentoId, onApproved]);

  async function handleCopy() {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(qrCode);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    } finally {
      setTimeout(() => setIsCopying(false), 2000);
    }
  }

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const expirado = secondsLeft === 0 && status === "pending";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-flame-500/30 bg-flame-500/5 p-4 text-center">
        <p className="text-xs uppercase tracking-wider text-onyx-400">
          Valor a pagar
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-flame-400">
          {formatBRL(valor)}
        </p>
      </div>

      {status === "pending" && !expirado && (
        <>
          <div className="flex items-center justify-center rounded-2xl border border-onyx-800 bg-ivory-50 p-4">
            <Image
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code Pix"
              width={240}
              height={240}
              unoptimized
              className="h-60 w-60"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-onyx-800 bg-onyx-950/40 px-3 py-2 text-xs">
            <span className="truncate font-mono text-onyx-300">
              {qrCode.substring(0, 32)}…
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-flame-500/10 px-2 py-1 font-semibold text-flame-300 hover:bg-flame-500/20"
            >
              {isCopying ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {isCopying ? "Copiado" : "Copiar"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-onyx-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando pagamento… expira em {mm}:{ss}
          </div>
        </>
      )}

      {status === "pending" && expirado && (
        <div className="rounded-xl border border-rust-500/40 bg-rust-500/10 p-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-rust-400" />
          <p className="mt-2 font-semibold text-ivory-50">QR Code expirado</p>
          <p className="mt-1 text-xs text-onyx-300">
            Gere um novo QR Code para tentar novamente.
          </p>
        </div>
      )}

      {status === "cancelled" || status === "rejected" ? (
        <div className="rounded-xl border border-rust-500/40 bg-rust-500/10 p-4 text-center">
          <XCircle className="mx-auto h-8 w-8 text-rust-400" />
          <p className="mt-2 font-semibold text-ivory-50">
            Pagamento não aprovado
          </p>
        </div>
      ) : null}

      {status === "approved" && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-2 font-semibold text-ivory-50">
            Pagamento confirmado!
          </p>
        </div>
      )}

      {status === "pending" && (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

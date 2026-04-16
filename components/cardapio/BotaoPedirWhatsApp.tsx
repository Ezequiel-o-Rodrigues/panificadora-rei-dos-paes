"use client";

import { MessageCircle } from "lucide-react";
import {
  formatPedidoWhatsApp,
  buildWhatsAppUrl,
  type PedidoItem,
} from "@/lib/modules/whatsapp/format-pedido";

interface BotaoPedirWhatsAppProps {
  itens: PedidoItem[];
  numero?: string;
  mesa?: number | null;
  variant?: "fab" | "inline";
}

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function BotaoPedirWhatsApp({
  itens,
  numero,
  mesa,
  variant = "fab",
}: BotaoPedirWhatsAppProps) {
  const totalItens = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const totalValor = itens.reduce(
    (acc, i) => acc + i.quantidade * i.precoUnitario,
    0,
  );

  function handleClick() {
    const mensagem = formatPedidoWhatsApp(itens, { mesa });
    const url = buildWhatsAppUrl(numero, mensagem);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-emerald-500"
      >
        <MessageCircle className="h-4 w-4" />
        Pedir pelo WhatsApp
      </button>
    );
  }

  if (totalItens === 0) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-emerald-500/40 transition hover:from-emerald-400 hover:to-emerald-500 sm:bottom-8 sm:right-8"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Pedir pelo WhatsApp</span>
      <span className="sm:hidden">WhatsApp</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
        {totalItens} {totalItens === 1 ? "item" : "itens"} · {formatBRL(totalValor)}
      </span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Printer, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, DialogFooter } from "@/components/admin";
import { isFeatureEnabled, getFeatureConfig } from "@/lib/features";

interface ComprovantePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conteudo: string;
  onClose?: () => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function ComprovantePreview({
  open,
  onOpenChange,
  conteudo,
  onClose,
}: ComprovantePreviewProps) {
  const router = useRouter();

  function handleImprimir() {
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) {
      toast.error("Permita popups para imprimir o comprovante");
      return;
    }
    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprovante</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body {
              font-family: 'Courier New', ui-monospace, monospace;
              font-size: 12px;
              white-space: pre;
              padding: 4mm 3mm;
              color: #000;
              background: #fff;
            }
          </style>
        </head>
        <body>${escapeHtml(conteudo)}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => win.close(), 300);
    }, 150);
  }

  function handleWhatsApp() {
    const cfg = getFeatureConfig("whatsapp_orders");
    const numero = cfg?.numero?.replace(/\D/g, "") ?? "";
    const text = encodeURIComponent(conteudo);
    const url = numero
      ? `https://wa.me/${numero}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleClose() {
    onOpenChange(false);
    onClose?.();
    router.refresh();
  }

  const hasWhatsApp = isFeatureEnabled("whatsapp_orders");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
      title="Comprovante de Venda"
      description="Comanda finalizada. Imprima ou compartilhe o comprovante."
      className="max-w-md"
    >
      <div className="max-h-[50vh] overflow-auto rounded-xl border border-onyx-800 bg-ivory-50 p-4 shadow-inner">
        <pre className="whitespace-pre font-mono text-[11px] leading-tight text-onyx-950">
          {conteudo}
        </pre>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>
          <X className="h-4 w-4" />
          Fechar
        </Button>
        {hasWhatsApp && (
          <Button variant="outline" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        )}
        <Button onClick={handleImprimir}>
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

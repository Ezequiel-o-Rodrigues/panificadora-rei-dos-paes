import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface StockAlertBannerProps {
  count: number;
}

export function StockAlertBanner({ count }: StockAlertBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rust-500/40 bg-rust-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rust-500/20 text-rust-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ivory-50">
            {count} produto{count !== 1 ? "s" : ""} com estoque crítico ou baixo
          </div>
          <p className="mt-0.5 text-xs text-onyx-300">
            Verifique os itens abaixo e registre uma entrada ou ajuste o estoque
            mínimo para evitar rupturas.
          </p>
        </div>
      </div>
      <Link
        href="/admin/estoque/entrada"
        className="inline-flex items-center justify-center rounded-xl border border-rust-500/50 bg-rust-500/20 px-4 py-2 text-sm font-semibold text-rust-200 transition hover:bg-rust-500/30"
      >
        Registrar entrada
      </Link>
    </div>
  );
}

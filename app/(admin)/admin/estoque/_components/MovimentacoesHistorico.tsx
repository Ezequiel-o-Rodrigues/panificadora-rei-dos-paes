"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { Badge } from "@/components/admin";
import { formatDateTime } from "@/lib/dates";
import type { MovimentacaoListItem } from "../_queries";

interface MovimentacoesHistoricoProps {
  movimentacoes: MovimentacaoListItem[];
  defaultOpen?: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};

function variantForTipo(tipo: string): "success" | "warning" | "info" {
  if (tipo === "entrada") return "success";
  if (tipo === "saida") return "info";
  return "warning";
}

function formatQty(valor: string | number, unidade: string): string {
  const n = Number(valor);
  const sign = n > 0 ? "+" : "";
  const formatted = `${sign}${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })}`;
  return `${formatted} ${unidade}`;
}

export function MovimentacoesHistorico({
  movimentacoes,
  defaultOpen = false,
}: MovimentacoesHistoricoProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-onyx-800/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ivory-50">
              Movimentações recentes
            </div>
            <div className="text-xs text-onyx-400">
              {movimentacoes.length} registro
              {movimentacoes.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-onyx-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-onyx-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-onyx-800/70">
          {movimentacoes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-onyx-400">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-onyx-900/95 backdrop-blur-sm">
                  <tr className="border-b border-onyx-800/70">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                      Data
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                      Quantidade
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                      Usuário
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-onyx-800/40">
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-onyx-800/40 transition">
                      <td className="px-4 py-2 text-onyx-200">
                        {formatDateTime(mov.createdAt)}
                      </td>
                      <td className="px-4 py-2 font-medium text-ivory-50">
                        {mov.produto.nome}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={variantForTipo(mov.tipo)}>
                          {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-onyx-200">
                        {formatQty(mov.quantidade, mov.produto.unidadeMedida)}
                      </td>
                      <td className="px-4 py-2 text-onyx-300">
                        {mov.usuario?.nome ?? "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

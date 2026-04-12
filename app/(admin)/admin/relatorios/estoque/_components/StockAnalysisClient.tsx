"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Card } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { ExportCSVButton } from "../../_components/ExportCSVButton";
import { formatQty } from "../../_helpers";
import type { AnaliseEstoqueRow, DateRange } from "../../_queries";

interface StockAnalysisClientProps {
  data: AnaliseEstoqueRow[];
  range: DateRange;
}

type FilterMode = "todos" | "com-perda" | "sem-movimentacao";

export function StockAnalysisClient({
  data,
  range,
}: StockAnalysisClientProps) {
  const [filter, setFilter] = useState<FilterMode>("todos");

  const filtered = useMemo(() => {
    if (filter === "com-perda") {
      return data.filter((row) => row.perdaQuantidade > 0);
    }
    if (filter === "sem-movimentacao") {
      return data.filter(
        (row) =>
          row.entradas === 0 && row.saidas === 0 && row.ajustes === 0,
      );
    }
    return data;
  }, [data, filter]);

  const csvFilename = `analise-estoque_${range.startDate}_${range.endDate}`;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ivory-50">
            Movimentações e perdas por produto
          </h3>
          <p className="text-xs text-onyx-400">
            Linhas destacadas em vermelho indicam diferenças detectadas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-onyx-700 bg-onyx-800/60 p-1">
            <FilterTab
              active={filter === "todos"}
              onClick={() => setFilter("todos")}
              label="Todos"
              count={data.length}
            />
            <FilterTab
              active={filter === "com-perda"}
              onClick={() => setFilter("com-perda")}
              label="Com perda"
              count={data.filter((r) => r.perdaQuantidade > 0).length}
            />
            <FilterTab
              active={filter === "sem-movimentacao"}
              onClick={() => setFilter("sem-movimentacao")}
              label="Sem movimentação"
              count={
                data.filter(
                  (r) =>
                    r.entradas === 0 && r.saidas === 0 && r.ajustes === 0,
                ).length
              }
            />
          </div>
          <ExportCSVButton
            data={filtered}
            filename={csvFilename}
            columns={[
              { header: "Produto", accessor: (r) => r.produtoNome },
              { header: "Categoria", accessor: (r) => r.categoriaNome },
              {
                header: "Estoque inicial",
                accessor: (r) =>
                  r.estoqueInicial.toFixed(3).replace(".", ","),
              },
              {
                header: "Entradas",
                accessor: (r) => r.entradas.toFixed(3).replace(".", ","),
              },
              {
                header: "Saídas",
                accessor: (r) => r.saidas.toFixed(3).replace(".", ","),
              },
              {
                header: "Ajustes",
                accessor: (r) => r.ajustes.toFixed(3).replace(".", ","),
              },
              {
                header: "Estoque teórico",
                accessor: (r) =>
                  r.estoqueTeorico.toFixed(3).replace(".", ","),
              },
              {
                header: "Estoque real",
                accessor: (r) => r.estoqueReal.toFixed(3).replace(".", ","),
              },
              {
                header: "Perda (qtd)",
                accessor: (r) =>
                  r.perdaQuantidade.toFixed(3).replace(".", ","),
              },
              {
                header: "Perda (R$)",
                accessor: (r) => r.perdaValor.toFixed(2).replace(".", ","),
              },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-onyx-800/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-onyx-800/70 bg-onyx-900/40">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Produto
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Estoque inicial
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Entradas
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-flame-400">
                Saídas
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Ajustes
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Teórico
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Real
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-rust-400">
                Perda
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-rust-400">
                Valor perda
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-800/40">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-onyx-400"
                >
                  Nenhum produto corresponde ao filtro selecionado
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const temPerda = row.perdaQuantidade > 0;
                return (
                  <tr
                    key={row.produtoId}
                    className={cn(
                      "transition hover:bg-onyx-800/40",
                      temPerda && "bg-rust-500/5",
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-ivory-50">
                          {row.produtoNome}
                        </span>
                        <span className="text-xs text-onyx-500">
                          {row.categoriaNome}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-onyx-300">
                      {formatQty(row.estoqueInicial)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-emerald-400">
                      {row.entradas > 0 ? `+${formatQty(row.entradas)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-flame-400">
                      {row.saidas > 0 ? `−${formatQty(row.saidas)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-onyx-400">
                      {row.ajustes !== 0
                        ? `${row.ajustes > 0 ? "+" : ""}${formatQty(row.ajustes)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-onyx-200">
                      {formatQty(row.estoqueTeorico)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-ivory-50">
                      {formatQty(row.estoqueReal)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {temPerda ? (
                        <Badge variant="danger">
                          −{formatQty(row.perdaQuantidade)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-onyx-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {temPerda ? (
                        <span className="font-mono text-xs font-semibold text-rust-400">
                          {formatBRL(row.perdaValor)}
                        </span>
                      ) : (
                        <span className="text-xs text-onyx-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <Button
      variant={active ? "primary" : "ghost"}
      size="sm"
      onClick={onClick}
      className={cn(!active && "text-onyx-300")}
    >
      {label}
      <span
        className={cn(
          "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          active
            ? "bg-white/20 text-white"
            : "bg-onyx-700 text-onyx-300",
        )}
      >
        {count}
      </span>
    </Button>
  );
}

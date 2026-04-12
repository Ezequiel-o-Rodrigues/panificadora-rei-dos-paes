"use client";

import { PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/admin";
import { formatBRL } from "@/lib/money";

interface TopCategoriasDatum {
  nome: string;
  totalVendas: number;
}

interface TopCategoriasChartProps {
  data: TopCategoriasDatum[];
}

const COLORS = [
  "#ff6d0a",
  "#ff8c28",
  "#ffa855",
  "#dc2626",
  "#ef4444",
  "#b91c1c",
  "#f59e0b",
  "#fbbf24",
] as const;

interface TooltipPayloadItem {
  value: number;
  name: string;
  payload: TopCategoriasDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-xl border border-onyx-700 bg-onyx-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-onyx-400">
        {item.payload.nome}
      </p>
      <p className="mt-1 font-display text-sm font-semibold text-flame-400">
        {formatBRL(item.value)}
      </p>
    </div>
  );
}

export function TopCategoriasChart({ data }: TopCategoriasChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.totalVendas > 0);
  const total = data.reduce((acc, d) => acc + d.totalVendas, 0);

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ivory-50">
            Top Categorias
          </h2>
          <p className="mt-1 text-xs text-onyx-400">Últimos 30 dias</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30">
          <PieChartIcon className="h-4 w-4" />
        </div>
      </div>

      {hasData ? (
        <>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="totalVendas"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="#0c0a09"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.nome}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="space-y-2">
            {data.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              const pct = total > 0 ? (item.totalVendas / total) * 100 : 0;
              return (
                <li
                  key={`${item.nome}-${index}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-onyx-200">{item.nome}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-medium text-ivory-50">
                      {formatBRL(item.totalVendas)}
                    </span>
                    <span className="text-onyx-500">{pct.toFixed(0)}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-onyx-400">
          Sem dados
        </div>
      )}
    </Card>
  );
}

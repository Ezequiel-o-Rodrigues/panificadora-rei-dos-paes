"use client";

import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/admin";
import { formatBRL } from "@/lib/money";

interface MonthlySalesDatum {
  label: string;
  totalVendas: number;
  totalComandas?: number;
}

interface MonthlySalesChartProps {
  data: MonthlySalesDatum[];
  ano: number;
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

interface TooltipPayloadItem {
  value: number;
  payload: MonthlySalesDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-xl border border-onyx-700 bg-onyx-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-onyx-400">
        {label}
      </p>
      <p className="mt-1 font-display text-sm font-semibold text-flame-400">
        {formatBRL(item.value)}
      </p>
      {typeof item.payload.totalComandas === "number" && (
        <p className="mt-0.5 text-xs text-onyx-300">
          {item.payload.totalComandas} comanda(s)
        </p>
      )}
    </div>
  );
}

export function MonthlySalesChart({ data, ano }: MonthlySalesChartProps) {
  const total = data.reduce((acc, d) => acc + d.totalVendas, 0);
  const hasData = data.some((d) => d.totalVendas > 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ivory-50">
            Vendas Mensais - {ano}
          </h2>
          <p className="mt-1 text-xs text-onyx-400">
            Total no ano: {formatBRL(total)}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>

      <div className="h-72 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="flameBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8c28" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ff6d0a" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#26211e" />
              <XAxis
                dataKey="label"
                stroke="#78716c"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#26211e" }}
              />
              <YAxis
                stroke="#78716c"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#26211e" }}
                tickFormatter={formatYAxis}
                width={70}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#ff6d0a", fillOpacity: 0.06 }}
              />
              <Bar
                dataKey="totalVendas"
                fill="url(#flameBarGradient)"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-onyx-400">
            Sem vendas registradas em {ano}.
          </div>
        )}
      </div>
    </Card>
  );
}

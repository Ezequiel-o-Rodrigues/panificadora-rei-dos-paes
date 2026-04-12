"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/admin";
import { formatBRL } from "@/lib/money";

interface SalesChartDatum {
  label: string;
  total: number;
}

interface SalesChartProps {
  data: SalesChartDatum[];
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

interface TooltipPayloadItem {
  value: number;
  payload: SalesChartDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-xl border border-onyx-700 bg-onyx-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-onyx-400">
        {label}
      </p>
      <p className="mt-1 font-display text-sm font-semibold text-flame-400">
        {formatBRL(value)}
      </p>
    </div>
  );
}

export function SalesChart({ data }: SalesChartProps) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const hasData = data.some((d) => d.total > 0);

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ivory-50">
            Vendas - Últimos 7 dias
          </h2>
          <p className="mt-1 text-xs text-onyx-400">
            Total no período: {formatBRL(total)}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30">
          <TrendingUp className="h-4 w-4" />
        </div>
      </div>

      <div className="h-72 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff8c28" />
                  <stop offset="100%" stopColor="#ff6d0a" />
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
                cursor={{ stroke: "#ff6d0a", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="url(#salesLineGradient)"
                strokeWidth={2.5}
                dot={{ fill: "#ff6d0a", r: 4, strokeWidth: 0 }}
                activeDot={{
                  fill: "#ff6d0a",
                  r: 6,
                  stroke: "#fff5eb",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-onyx-400">
            Sem vendas no período.
          </div>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, DataTable, type Column } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { ExportCSVButton } from "../../_components/ExportCSVButton";
import {
  formatPeriodoLabel,
  labelFormaPagamento,
} from "../../_helpers";
import type {
  DateRange,
  FormaPagamentoRow,
  Granularity,
  VendasPeriodoRow,
} from "../../_queries";

interface SalesReportClientProps {
  data: VendasPeriodoRow[];
  formasPagamento: FormaPagamentoRow[];
  granularity: Granularity;
  range: DateRange;
}

const CHART_COLORS = [
  "#ff6b35", // flame-500
  "#ff8c5a",
  "#e65417",
  "#ffaf85",
  "#b83a0e",
  "#ffd4b8",
];

interface ChartPoint {
  periodo: string;
  label: string;
  vendas: number;
  comandas: number;
  gorjetas: number;
  ticketMedio: number;
}

export function SalesReportClient({
  data,
  formasPagamento,
  granularity,
  range,
}: SalesReportClientProps) {
  const chartData: ChartPoint[] = useMemo(
    () =>
      data.map((row) => ({
        periodo: row.periodo,
        label: formatPeriodoLabel(row.periodo, granularity),
        vendas: row.totalVendas,
        comandas: row.totalComandas,
        gorjetas: row.totalGorjetas,
        ticketMedio: row.ticketMedio,
      })),
    [data, granularity],
  );

  const pieData = useMemo(
    () =>
      formasPagamento.map((row, idx) => ({
        name: labelFormaPagamento(row.formaPagamento),
        value: row.totalVendas,
        comandas: row.totalComandas,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      })),
    [formasPagamento],
  );

  const totalFormas = useMemo(
    () => pieData.reduce((acc, p) => acc + p.value, 0),
    [pieData],
  );

  const columns: Column<VendasPeriodoRow>[] = [
    {
      key: "periodo",
      header: "Período",
      render: (row) => (
        <span className="font-medium text-ivory-50">
          {formatPeriodoLabel(row.periodo, granularity)}
        </span>
      ),
    },
    {
      key: "comandas",
      header: "Comandas",
      className: "text-right",
      render: (row) => (
        <span className="block text-right">
          {row.totalComandas.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "vendas",
      header: "Vendas",
      className: "text-right",
      render: (row) => (
        <span className="block text-right font-semibold text-ivory-50">
          {formatBRL(row.totalVendas)}
        </span>
      ),
    },
    {
      key: "gorjetas",
      header: "Gorjetas",
      className: "text-right",
      render: (row) => (
        <span className="block text-right text-onyx-300">
          {formatBRL(row.totalGorjetas)}
        </span>
      ),
    },
    {
      key: "ticket",
      header: "Ticket médio",
      className: "text-right",
      render: (row) => (
        <span className="block text-right text-flame-400">
          {formatBRL(row.ticketMedio)}
        </span>
      ),
    },
  ];

  const csvFilename = `relatorio-vendas_${range.startDate}_${range.endDate}_${granularity}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-ivory-50">
                Evolução de vendas
              </h3>
              <p className="text-xs text-onyx-400">
                Total vendido por{" "}
                {granularity === "dia"
                  ? "dia"
                  : granularity === "semana"
                  ? "semana"
                  : "mês"}
              </p>
            </div>
          </div>
          <div className="h-80 w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-onyx-400">
                Sem dados para o período selecionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="gradient-vendas"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ff6b35"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="100%"
                        stopColor="#ff6b35"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#27272a" }}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#27272a" }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "12px",
                      color: "#fafafa",
                    }}
                    labelStyle={{ color: "#fafafa" }}
                    formatter={(value, name) => {
                      if (name === "vendas")
                        return [formatBRL(Number(value)), "Vendas"];
                      return [String(value), String(name)];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="#ff6b35"
                    strokeWidth={2}
                    fill="url(#gradient-vendas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="font-display text-lg font-bold text-ivory-50">
              Formas de pagamento
            </h3>
            <p className="text-xs text-onyx-400">
              Distribuição do faturamento
            </p>
          </div>
          <div className="h-60 w-full">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-onyx-400">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke="#0a0a0a"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "12px",
                      color: "#fafafa",
                    }}
                    formatter={(value) => formatBRL(Number(value))}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", color: "#d4d4d8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-onyx-800/60 pt-3 text-xs">
            {pieData.map((p) => {
              const pct = totalFormas > 0 ? (p.value / totalFormas) * 100 : 0;
              return (
                <div
                  key={p.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-onyx-300">{p.name}</span>
                  </div>
                  <span className="font-medium text-ivory-50">
                    {formatBRL(p.value)}{" "}
                    <span className="text-onyx-500">
                      ({pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ivory-50">
              Detalhamento por período
            </h3>
            <p className="text-xs text-onyx-400">
              Granularidade: {granularity}
            </p>
          </div>
          <ExportCSVButton
            data={data}
            filename={csvFilename}
            columns={[
              {
                header: "Período",
                accessor: (r) => formatPeriodoLabel(r.periodo, granularity),
              },
              {
                header: "Comandas",
                accessor: (r) => r.totalComandas,
              },
              {
                header: "Total vendas (R$)",
                accessor: (r) => r.totalVendas.toFixed(2).replace(".", ","),
              },
              {
                header: "Gorjetas (R$)",
                accessor: (r) => r.totalGorjetas.toFixed(2).replace(".", ","),
              },
              {
                header: "Ticket médio (R$)",
                accessor: (r) => r.ticketMedio.toFixed(2).replace(".", ","),
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.periodo}
          emptyMessage="Nenhuma venda no período"
          className="border-0"
        />
      </Card>
    </div>
  );
}

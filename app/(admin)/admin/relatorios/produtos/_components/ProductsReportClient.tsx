"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, DataTable, type Column } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { ExportCSVButton } from "../../_components/ExportCSVButton";
import { formatQty } from "../../_helpers";
import type { DateRange, ProdutoVendidoRow } from "../../_queries";

interface ProductsReportClientProps {
  data: ProdutoVendidoRow[];
  range: DateRange;
}

export function ProductsReportClient({
  data,
  range,
}: ProductsReportClientProps) {
  // Top 10 para o gráfico
  const top10 = useMemo(() => data.slice(0, 10), [data]);

  const chartData = useMemo(
    () =>
      top10.map((p) => ({
        nome:
          p.produtoNome.length > 24
            ? p.produtoNome.slice(0, 22) + "…"
            : p.produtoNome,
        nomeCompleto: p.produtoNome,
        valor: p.valorTotal,
        quantidade: p.totalVendido,
      })),
    [top10],
  );

  const columns: Column<ProdutoVendidoRow & { ranking: number }>[] = [
    {
      key: "ranking",
      header: "#",
      className: "w-12",
      render: (row) => (
        <span className="font-semibold text-onyx-400">#{row.ranking}</span>
      ),
    },
    {
      key: "nome",
      header: "Produto",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-ivory-50">{row.produtoNome}</span>
          <span className="text-xs text-onyx-500">{row.categoriaNome}</span>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (row) => <Badge variant="neutral">{row.categoriaNome}</Badge>,
    },
    {
      key: "qtd",
      header: "Qtd. vendida",
      className: "text-right",
      render: (row) => (
        <span className="block text-right">
          {formatQty(row.totalVendido)}
        </span>
      ),
    },
    {
      key: "comandas",
      header: "Nº comandas",
      className: "text-right",
      render: (row) => (
        <span className="block text-right text-onyx-300">
          {row.numComandas.toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "precoMedio",
      header: "Preço médio",
      className: "text-right",
      render: (row) => (
        <span className="block text-right text-onyx-300">
          {formatBRL(row.precoMedio)}
        </span>
      ),
    },
    {
      key: "valor",
      header: "Faturamento",
      className: "text-right",
      render: (row) => (
        <span className="block text-right font-semibold text-flame-400">
          {formatBRL(row.valorTotal)}
        </span>
      ),
    },
  ];

  const rankedData = useMemo(
    () => data.map((row, idx) => ({ ...row, ranking: idx + 1 })),
    [data],
  );

  const csvFilename = `relatorio-produtos_${range.startDate}_${range.endDate}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h3 className="font-display text-lg font-bold text-ivory-50">
            Top 10 por faturamento
          </h3>
          <p className="text-xs text-onyx-400">
            Produtos que mais geraram receita no período
          </p>
        </div>
        <div className="h-96 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-onyx-400">
              Sem vendas no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />
                <YAxis
                  dataKey="nome"
                  type="category"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  width={180}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "12px",
                    color: "#fafafa",
                  }}
                  cursor={{ fill: "rgba(255,107,53,0.08)" }}
                  formatter={(value) => [formatBRL(Number(value)), "Faturamento"]}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { nomeCompleto?: string })
                      ?.nomeCompleto ?? ""
                  }
                />
                <Bar
                  dataKey="valor"
                  fill="#ff6b35"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ivory-50">
              Ranking completo
            </h3>
            <p className="text-xs text-onyx-400">
              Até 100 produtos, ordenados por faturamento
            </p>
          </div>
          <ExportCSVButton
            data={rankedData}
            filename={csvFilename}
            columns={[
              { header: "Ranking", accessor: (r) => r.ranking },
              { header: "Produto", accessor: (r) => r.produtoNome },
              { header: "Categoria", accessor: (r) => r.categoriaNome },
              {
                header: "Quantidade vendida",
                accessor: (r) =>
                  r.totalVendido.toFixed(3).replace(".", ","),
              },
              { header: "Nº comandas", accessor: (r) => r.numComandas },
              {
                header: "Preço médio (R$)",
                accessor: (r) => r.precoMedio.toFixed(2).replace(".", ","),
              },
              {
                header: "Faturamento (R$)",
                accessor: (r) => r.valorTotal.toFixed(2).replace(".", ","),
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={rankedData}
          keyExtractor={(row) => row.produtoId}
          emptyMessage="Nenhum produto vendido no período"
          className="border-0"
        />
      </Card>
    </div>
  );
}

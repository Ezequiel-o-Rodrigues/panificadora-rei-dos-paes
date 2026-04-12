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
import {
  Badge,
  type BadgeProps,
  Card,
  DataTable,
  type Column,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import type { ClassificacaoGarcom } from "@/lib/calculations";
import { ExportCSVButton } from "../../_components/ExportCSVButton";
import type { DateRange } from "../../_queries";
import type { DesempenhoGarcomComputed } from "../page";

interface WaitersReportClientProps {
  data: DesempenhoGarcomComputed[];
  taxaComissao: number;
  mediaTicketMedio: number;
  range: DateRange;
}

const CLASSIFICACAO_VARIANT: Record<
  ClassificacaoGarcom,
  NonNullable<BadgeProps["variant"]>
> = {
  Excelente: "success",
  Bom: "info",
  Regular: "warning",
  "Abaixo da média": "danger",
};

export function WaitersReportClient({
  data,
  taxaComissao,
  mediaTicketMedio,
  range,
}: WaitersReportClientProps) {
  const chartData = useMemo(
    () =>
      data.map((g) => ({
        nome:
          g.nome.length > 16 ? g.nome.slice(0, 14) + "…" : g.nome,
        nomeCompleto: g.nome,
        vendas: g.totalVendas,
        ticketMedio: g.ticketMedio,
      })),
    [data],
  );

  const columns: Column<DesempenhoGarcomComputed>[] = [
    {
      key: "nome",
      header: "Garçom",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-ivory-50">{row.nome}</span>
          <span className="font-mono text-[10px] uppercase text-onyx-500">
            {row.codigo}
          </span>
        </div>
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
    {
      key: "performance",
      header: "% da média",
      className: "text-right",
      render: (row) => {
        const pct = row.ratio * 100;
        const color =
          row.ratio >= 1.2
            ? "text-emerald-400"
            : row.ratio >= 1.0
            ? "text-flame-400"
            : row.ratio >= 0.8
            ? "text-amber-400"
            : "text-rust-400";
        return (
          <span className={`block text-right font-semibold ${color}`}>
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: "classificacao",
      header: "Classificação",
      render: (row) => (
        <Badge variant={CLASSIFICACAO_VARIANT[row.classificacao]}>
          {row.classificacao}
        </Badge>
      ),
    },
    {
      key: "comissao",
      header: "Comissão",
      className: "text-right",
      render: (row) => (
        <span className="block text-right font-semibold text-flame-400">
          {formatBRL(row.comissao)}
        </span>
      ),
    },
  ];

  const csvFilename = `desempenho-garcons_${range.startDate}_${range.endDate}`;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h3 className="font-display text-lg font-bold text-ivory-50">
            Vendas por garçom
          </h3>
          <p className="text-xs text-onyx-400">
            Ranking de faturamento no período selecionado
          </p>
        </div>
        <div className="h-80 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-onyx-400">
              Nenhum garçom ativo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="nome"
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
                  cursor={{ fill: "rgba(255,107,53,0.08)" }}
                  formatter={(value) => [formatBRL(Number(value)), "Vendas"]}
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { nomeCompleto?: string })
                      ?.nomeCompleto ?? ""
                  }
                />
                <Bar
                  dataKey="vendas"
                  fill="#ff6b35"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ivory-50">
              Detalhes de desempenho
            </h3>
            <p className="text-xs text-onyx-400">
              Classificação baseada no ticket médio geral de{" "}
              {formatBRL(mediaTicketMedio)}. Comissão calculada sobre vendas à
              taxa de {(taxaComissao * 100).toFixed(2)}%.
            </p>
          </div>
          <ExportCSVButton
            data={data}
            filename={csvFilename}
            columns={[
              { header: "Garçom", accessor: (r) => r.nome },
              { header: "Código", accessor: (r) => r.codigo },
              { header: "Comandas", accessor: (r) => r.totalComandas },
              {
                header: "Vendas (R$)",
                accessor: (r) => r.totalVendas.toFixed(2).replace(".", ","),
              },
              {
                header: "Gorjetas (R$)",
                accessor: (r) =>
                  r.totalGorjetas.toFixed(2).replace(".", ","),
              },
              {
                header: "Ticket médio (R$)",
                accessor: (r) => r.ticketMedio.toFixed(2).replace(".", ","),
              },
              {
                header: "% da média",
                accessor: (r) =>
                  (r.ratio * 100).toFixed(2).replace(".", ","),
              },
              { header: "Classificação", accessor: (r) => r.classificacao },
              {
                header: "Comissão (R$)",
                accessor: (r) => r.comissao.toFixed(2).replace(".", ","),
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(row) => row.garcomId}
          emptyMessage="Nenhum garçom ativo"
          className="border-0"
        />
      </Card>
    </div>
  );
}

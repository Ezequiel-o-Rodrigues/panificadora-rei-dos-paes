"use client";

import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { Card, DataTable, EmptyState, type Column } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import type { ComandaRecente } from "../_queries";

interface RecentOrdersListProps {
  comandas: ComandaRecente[];
}

export function RecentOrdersList({ comandas }: RecentOrdersListProps) {
  const router = useRouter();

  const columns: Column<ComandaRecente>[] = [
    {
      key: "numero",
      header: "#",
      className: "w-20",
      render: (row) => (
        <span className="font-display font-semibold text-ivory-50">
          #{String(row.numero).padStart(4, "0")}
        </span>
      ),
    },
    {
      key: "dataFechamento",
      header: "Fechada em",
      render: (row) => (
        <span className="text-onyx-200">
          {row.dataFechamento
            ? formatDateTime(row.dataFechamento)
            : formatDateTime(row.dataAbertura)}
        </span>
      ),
    },
    {
      key: "garcom",
      header: "Garçom",
      render: (row) => (
        <span className="text-onyx-300">{row.garcom?.nome ?? "—"}</span>
      ),
    },
    {
      key: "valorTotal",
      header: "Total",
      className: "text-right",
      render: (row) => (
        <span className="font-medium text-ivory-50">
          {formatBRL(row.valorTotal)}
        </span>
      ),
    },
  ];

  return (
    <Card className="flex flex-col gap-4 p-0">
      <div className="flex items-start justify-between p-6 pb-0">
        <div>
          <h2 className="font-display text-lg font-bold text-ivory-50">
            Comandas recentes
          </h2>
          <p className="mt-1 text-xs text-onyx-400">
            Últimas 10 comandas finalizadas
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30">
          <Receipt className="h-4 w-4" />
        </div>
      </div>

      {comandas.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma comanda finalizada"
          description="As comandas finalizadas aparecerão aqui assim que forem registradas."
        />
      ) : (
        <div className="px-6 pb-6">
          <DataTable
            columns={columns}
            data={comandas}
            keyExtractor={(row) => row.id}
            emptyMessage="Nenhuma comanda recente"
            onRowClick={(row) => router.push(`/admin/comandas/${row.id}`)}
          />
        </div>
      )}
    </Card>
  );
}

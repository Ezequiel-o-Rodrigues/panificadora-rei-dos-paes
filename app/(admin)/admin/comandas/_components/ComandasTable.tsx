"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { DataTable, Badge, type Column } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import type { ComandaListItem } from "../_queries";

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

type StatusVariant = "info" | "success" | "danger";

const STATUS_BADGE: Record<
  "aberta" | "finalizada" | "cancelada",
  { variant: StatusVariant; label: string }
> = {
  aberta: { variant: "info", label: "Aberta" },
  finalizada: { variant: "success", label: "Finalizada" },
  cancelada: { variant: "danger", label: "Cancelada" },
};

interface ComandasTableProps {
  comandas: ComandaListItem[];
}

export function ComandasTable({ comandas }: ComandasTableProps) {
  const router = useRouter();

  const columns: Column<ComandaListItem>[] = [
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
      key: "dataAbertura",
      header: "Abertura",
      render: (row) => (
        <span className="text-onyx-200">{formatDateTime(row.dataAbertura)}</span>
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
      key: "itens",
      header: "Itens",
      className: "text-center",
      render: (row) => {
        const count = row.itens.length + row.itensLivres.length;
        return <span className="text-onyx-200">{count}</span>;
      },
    },
    {
      key: "valorTotal",
      header: "Total",
      render: (row) => (
        <span className="font-medium text-ivory-50">
          {formatBRL(row.valorTotal)}
        </span>
      ),
    },
    {
      key: "formaPagamento",
      header: "Pagamento",
      render: (row) => (
        <span className="text-onyx-300">
          {row.formaPagamento
            ? (FORMA_PAGAMENTO_LABELS[row.formaPagamento] ?? row.formaPagamento)
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const config = STATUS_BADGE[row.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "acoes",
      header: "",
      className: "w-12 text-right",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/comandas/${row.id}`);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-onyx-400 transition hover:bg-onyx-800 hover:text-ivory-50 cursor-pointer"
          title="Ver detalhes"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={comandas}
      keyExtractor={(row) => row.id}
      emptyMessage="Nenhuma comanda encontrada com os filtros atuais"
      onRowClick={(row) => router.push(`/admin/comandas/${row.id}`)}
    />
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  Badge,
  Button,
  Dialog,
  DateRangePicker,
  type Column,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { marcarPerdaVisualizada } from "../../_actions";
import type { PerdaListItem, ProdutoEstoqueForm } from "../../_queries";
import { LossForm } from "./LossForm";

interface LossesTableProps {
  perdas: PerdaListItem[];
  produtos: ProdutoEstoqueForm[];
  initialStartDate: string;
  initialEndDate: string;
}

export function LossesTable({
  perdas,
  produtos,
  initialStartDate,
  initialEndDate,
}: LossesTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleMarcarVisualizada(
    e: React.MouseEvent,
    id: number,
  ) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await marcarPerdaVisualizada(id);
      if (result.success) {
        toast.success("Perda marcada como visualizada.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao atualizar perda.");
      }
    });
  }

  function handleRangeChange(start: string, end: string) {
    const params = new URLSearchParams();
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    router.push(`/admin/estoque/perdas?${params.toString()}`);
  }

  function handleSuccess() {
    setDialogOpen(false);
    toast.success("Perda registrada com sucesso!");
    router.refresh();
  }

  const columns: Column<PerdaListItem>[] = [
    {
      key: "data",
      header: "Data",
      render: (row) => (
        <span className="text-onyx-200">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "produto",
      header: "Produto",
      render: (row) => (
        <span className="font-medium text-ivory-50">{row.produto.nome}</span>
      ),
    },
    {
      key: "quantidade",
      header: "Quantidade",
      render: (row) => (
        <span className="text-onyx-200">
          {Number(row.quantidade).toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
          })}{" "}
          {row.produto.unidadeMedida}
        </span>
      ),
    },
    {
      key: "valor",
      header: "Valor",
      render: (row) => (
        <span className="font-semibold text-rust-400">
          {formatBRL(row.valor)}
        </span>
      ),
    },
    {
      key: "motivo",
      header: "Motivo",
      render: (row) => (
        <span className="block max-w-xs truncate text-onyx-300" title={row.motivo}>
          {row.motivo}
        </span>
      ),
    },
    {
      key: "usuario",
      header: "Registrado por",
      render: (row) => (
        <span className="text-onyx-300">{row.usuario?.nome ?? "--"}</span>
      ),
    },
    {
      key: "visualizada",
      header: "Status",
      render: (row) =>
        row.visualizada ? (
          <Badge variant="neutral" className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Visualizada
          </Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-right",
      render: (row) =>
        row.visualizada ? (
          <span className="text-xs text-onyx-500">--</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={(e) => handleMarcarVisualizada(e, row.id)}
          >
            <Check className="h-3 w-3" />
            Marcar visualizada
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRangePicker
          startDate={initialStartDate}
          endDate={initialEndDate}
          onRangeChange={handleRangeChange}
        />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Perda
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={perdas}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhuma perda registrada no período"
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nova Perda"
        description="Registre perdas de estoque (quebras, vencimentos, descarte)"
      >
        <LossForm
          produtos={produtos}
          onSuccess={handleSuccess}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  );
}

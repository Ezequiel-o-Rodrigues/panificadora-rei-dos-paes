"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import {
  DataTable,
  Badge,
  Input,
  Select,
  type Column,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import type { EstoqueResumoItem } from "../_queries";

interface StockTableProps {
  produtos: EstoqueResumoItem[];
  categorias: { id: number; nome: string }[];
}

function formatQuantidade(valor: string | number, unidade: string): string {
  const n = Number(valor);
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${unidade}`;
}

function renderStatusBadge(level: "normal" | "baixo" | "critico") {
  if (level === "critico") {
    return (
      <Badge variant="danger" className="inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Crítico
      </Badge>
    );
  }
  if (level === "baixo") {
    return (
      <Badge variant="warning" className="inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Baixo
      </Badge>
    );
  }
  return <Badge variant="success">Normal</Badge>;
}

export function StockTable({ produtos, categorias }: StockTableProps) {
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    let result = produtos;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter((p) => p.nome.toLowerCase().includes(term));
    }

    if (categoriaFilter) {
      const catId = Number(categoriaFilter);
      result = result.filter((p) => p.categoriaId === catId);
    }

    if (statusFilter) {
      result = result.filter((p) => p.alertLevel === statusFilter);
    }

    return result;
  }, [produtos, search, categoriaFilter, statusFilter]);

  const categoriaOptions = categorias.map((cat) => ({
    value: String(cat.id),
    label: cat.nome,
  }));

  const statusOptions = [
    { value: "critico", label: "Crítico" },
    { value: "baixo", label: "Baixo" },
    { value: "normal", label: "Normal" },
  ];

  const columns: Column<EstoqueResumoItem>[] = [
    {
      key: "nome",
      header: "Produto",
      render: (row) => (
        <span className="font-medium text-ivory-50">{row.nome}</span>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (row) => (
        <span className="text-onyx-300">{row.categoria.nome}</span>
      ),
    },
    {
      key: "estoqueAtual",
      header: "Estoque atual",
      render: (row) => (
        <span className="text-ivory-50">
          {formatQuantidade(row.estoqueAtual, row.unidadeMedida)}
        </span>
      ),
    },
    {
      key: "estoqueMinimo",
      header: "Mínimo",
      render: (row) => (
        <span className="text-onyx-300">
          {formatQuantidade(row.estoqueMinimo, row.unidadeMedida)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => renderStatusBadge(row.alertLevel),
    },
    {
      key: "preco",
      header: "Preço",
      render: (row) => (
        <span className="text-ivory-50">{formatBRL(row.preco)}</span>
      ),
    },
    {
      key: "valorTotal",
      header: "Valor total",
      render: (row) => (
        <span className="font-semibold text-emerald-400">
          {formatBRL(row.valorTotal)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-onyx-400" />
          <Input
            placeholder="Buscar produto por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            placeholder="Todas as categorias"
            options={categoriaOptions}
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            placeholder="Todos os status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhum produto encontrado"
      />
    </div>
  );
}

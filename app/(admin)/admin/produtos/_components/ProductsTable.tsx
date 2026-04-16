"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, Badge, Input, Select, ConfirmDialog, type Column } from "@/components/admin";
import { ProductImage } from "@/components/shared/ProductImage";
import { formatBRL } from "@/lib/money";
import { toast } from "sonner";
import {
  toggleProdutoAtivo,
  toggleProdutoDisponivel,
  deleteProduto,
} from "../_actions";
import type { Produto, Categoria } from "@/db/schema";
import { Eye, EyeOff, Power, PowerOff, AlertTriangle, Trash2 } from "lucide-react";

type ProdutoComCategoria = Produto & { categoria: Categoria };

const UNIDADE_LABELS: Record<string, string> = {
  un: "Unidade",
  kg: "Quilograma",
  g: "Grama",
  fatia: "Fatia",
  pacote: "Pacote",
  porcao: "Porção",
  litro: "Litro",
  ml: "Mililitro",
  metro: "Metro",
  combo: "Combo",
};

interface ProductsTableProps {
  produtos: ProdutoComCategoria[];
  categorias: { id: number; nome: string }[];
}

export function ProductsTable({ produtos, categorias }: ProductsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [deletingProduto, setDeletingProduto] = useState<ProdutoComCategoria | null>(null);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");

  const filteredProdutos = useMemo(() => {
    let result = produtos;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter((p) => p.nome.toLowerCase().includes(term));
    }

    if (categoriaFilter) {
      const catId = Number(categoriaFilter);
      result = result.filter((p) => p.categoriaId === catId);
    }

    return result;
  }, [produtos, search, categoriaFilter]);

  function handleToggleDisponivel(
    e: React.MouseEvent,
    produtoId: number,
  ) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleProdutoDisponivel(produtoId);
      if (result.success) {
        toast.success("Disponibilidade atualizada!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao alterar disponibilidade.");
      }
    });
  }

  function handleToggleAtivo(e: React.MouseEvent, produtoId: number) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleProdutoAtivo(produtoId);
      if (result.success) {
        toast.success("Status atualizado!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao alterar status.");
      }
    });
  }

  function handleDelete() {
    if (!deletingProduto) return;
    startDelete(async () => {
      const result = await deleteProduto(deletingProduto.id);
      if (result.success) {
        if (result.archived) {
          toast.success(
            "Produto desativado! Como possui histórico de vendas, foi arquivado em vez de excluído.",
          );
        } else {
          toast.success("Produto excluído permanentemente!");
        }
        setDeletingProduto(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao excluir produto.");
      }
    });
  }

  const categoriaOptions = categorias.map((cat) => ({
    value: String(cat.id),
    label: cat.nome,
  }));

  const estoqueAlerta = (produto: ProdutoComCategoria) => {
    const atual = Number(produto.estoqueAtual);
    const minimo = Number(produto.estoqueMinimo);
    return minimo > 0 && atual <= minimo;
  };

  const columns: Column<ProdutoComCategoria>[] = [
    {
      key: "imagem",
      header: "",
      className: "w-16",
      render: (row) => (
        <ProductImage
          src={row.imagemUrl}
          alt={row.nome}
          className="h-12 w-12"
          rounded="lg"
          sizes="48px"
        />
      ),
    },
    {
      key: "nome",
      header: "Nome",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-ivory-50">{row.nome}</span>
          {row.destaque && (
            <Badge variant="info">Destaque</Badge>
          )}
        </div>
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
      key: "preco",
      header: "Preco",
      render: (row) => (
        <span className="font-medium text-ivory-50">
          {formatBRL(row.preco)}
        </span>
      ),
    },
    {
      key: "estoque",
      header: "Estoque",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-onyx-200">
            {Number(row.estoqueAtual).toLocaleString("pt-BR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 3,
            })}
          </span>
          {estoqueAlerta(row) && (
            <span title="Estoque abaixo do minimo">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "unidade",
      header: "Unidade",
      render: (row) => (
        <span className="text-onyx-300">
          {UNIDADE_LABELS[row.unidadeMedida] ?? row.unidadeMedida}
        </span>
      ),
    },
    {
      key: "disponivel",
      header: "Disponivel",
      className: "text-center",
      render: (row) => (
        <button
          onClick={(e) => handleToggleDisponivel(e, row.id)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          title={row.disponivelHoje ? "Marcar como indisponivel" : "Marcar como disponivel"}
        >
          {row.disponivelHoje ? (
            <>
              <Eye className="h-4 w-4 text-emerald-400" />
              <Badge variant="success">Sim</Badge>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 text-onyx-500" />
              <Badge variant="neutral">Nao</Badge>
            </>
          )}
        </button>
      ),
    },
    {
      key: "ativo",
      header: "Ativo",
      className: "text-center",
      render: (row) => (
        <button
          onClick={(e) => handleToggleAtivo(e, row.id)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          title={row.ativo ? "Desativar produto" : "Ativar produto"}
        >
          {row.ativo ? (
            <>
              <Power className="h-4 w-4 text-emerald-400" />
              <Badge variant="success">Ativo</Badge>
            </>
          ) : (
            <>
              <PowerOff className="h-4 w-4 text-rust-400" />
              <Badge variant="danger">Inativo</Badge>
            </>
          )}
        </button>
      ),
    },
    {
      key: "acoes",
      header: "",
      className: "w-12 text-center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeletingProduto(row);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rust-400 hover:text-rust-300 hover:bg-onyx-800/50 transition-colors cursor-pointer"
          title="Excluir produto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        <DataTable
          columns={columns}
          data={filteredProdutos}
          keyExtractor={(row) => row.id}
          emptyMessage="Nenhum produto encontrado"
          onRowClick={(row) => router.push(`/admin/produtos/${row.id}`)}
        />
      </div>

      <ConfirmDialog
        open={!!deletingProduto}
        onOpenChange={(open) => {
          if (!open) setDeletingProduto(null);
        }}
        title="Excluir Produto"
        message={
          deletingProduto
            ? `Tem certeza que deseja excluir o produto "${deletingProduto.nome}"? Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={isDeleting}
        variant="danger"
      />
    </>
  );
}

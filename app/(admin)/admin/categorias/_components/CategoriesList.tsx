"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  ConfirmDialog,
} from "@/components/admin";
import {
  toggleCategoriaAtivo,
  updateCategoria,
  deleteCategoria,
} from "../_actions";
import { CategoryForm } from "./CategoryForm";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Power,
  GripVertical,
  Package,
} from "lucide-react";
import type { Categoria } from "@/db/schema";

interface CategoriesListProps {
  categorias: Categoria[];
  productCounts: Record<number, number>;
}

export function CategoriesList({
  categorias,
  productCounts,
}: CategoriesListProps) {
  const router = useRouter();
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(
    null
  );
  const [deletingCategoria, setDeletingCategoria] = useState<Categoria | null>(
    null
  );
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function handleToggle(id: number) {
    setTogglingId(id);
    startToggle(async () => {
      const result = await toggleCategoriaAtivo(id);
      if (result.success) {
        toast.success("Status atualizado!");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao alterar status.");
      }
      setTogglingId(null);
    });
  }

  function handleDelete() {
    if (!deletingCategoria) return;
    startDelete(async () => {
      const result = await deleteCategoria(deletingCategoria.id);
      if (result.success) {
        toast.success("Categoria excluída!");
        setDeletingCategoria(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao excluir categoria.");
      }
    });
  }

  return (
    <>
      <Card className="divide-y divide-onyx-800/70 p-0 overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-onyx-400">
          <span className="w-6" />
          <span>Categoria</span>
          <span>Slug</span>
          <span className="text-center">Produtos</span>
          <span className="text-center">Status</span>
          <span className="text-right">Ações</span>
        </div>

        {categorias.map((categoria) => {
          const prodCount = productCounts[categoria.id] ?? 0;
          const isCurrentToggling =
            isToggling && togglingId === categoria.id;

          return (
            <div
              key={categoria.id}
              className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-4 px-6 py-4 transition hover:bg-onyx-800/30"
            >
              {/* Icon */}
              <span className="text-xl leading-none" title={categoria.icone ?? ""}>
                {categoria.icone || (
                  <GripVertical className="h-5 w-5 text-onyx-600" />
                )}
              </span>

              {/* Name */}
              <div className="min-w-0">
                <p className="truncate font-medium text-ivory-50">
                  {categoria.nome}
                </p>
                {categoria.descricao && (
                  <p className="mt-0.5 truncate text-xs text-onyx-400">
                    {categoria.descricao}
                  </p>
                )}
                {/* Mobile-only slug */}
                <p className="mt-0.5 text-xs text-onyx-500 sm:hidden">
                  {categoria.slug}
                </p>
              </div>

              {/* Slug - desktop */}
              <span className="hidden truncate text-sm text-onyx-400 sm:block font-mono">
                {categoria.slug}
              </span>

              {/* Product count */}
              <div className="hidden sm:flex items-center justify-center gap-1.5 text-sm text-onyx-300">
                <Package className="h-3.5 w-3.5" />
                {prodCount}
              </div>

              {/* Status badge */}
              <div className="hidden sm:flex justify-center">
                <Badge variant={categoria.ativo ? "success" : "neutral"}>
                  {categoria.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Mobile badge */}
                <Badge
                  variant={categoria.ativo ? "success" : "neutral"}
                  className="sm:hidden mr-1"
                >
                  {categoria.ativo ? "Ativa" : "Inativa"}
                </Badge>

                <Button
                  variant="ghost"
                  size="icon"
                  title={
                    categoria.ativo
                      ? "Desativar categoria"
                      : "Ativar categoria"
                  }
                  onClick={() => handleToggle(categoria.id)}
                  loading={isCurrentToggling}
                  className="h-8 w-8"
                >
                  <Power className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar categoria"
                  onClick={() => setEditingCategoria(categoria)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir categoria"
                  onClick={() => setDeletingCategoria(categoria)}
                  className="h-8 w-8 text-rust-400 hover:text-rust-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingCategoria}
        onOpenChange={(open) => {
          if (!open) setEditingCategoria(null);
        }}
        title="Editar Categoria"
        description="Altere os dados da categoria abaixo."
      >
        {editingCategoria && (
          <CategoryForm
            defaultValues={{
              nome: editingCategoria.nome,
              descricao: editingCategoria.descricao ?? "",
              icone: editingCategoria.icone ?? "",
              ordem: editingCategoria.ordem,
            }}
            action={(formData) =>
              updateCategoria(editingCategoria.id, formData)
            }
            onSuccess={() => setEditingCategoria(null)}
            submitLabel="Atualizar"
          />
        )}
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingCategoria}
        onOpenChange={(open) => {
          if (!open) setDeletingCategoria(null);
        }}
        title="Excluir Categoria"
        message={
          deletingCategoria
            ? `Tem certeza que deseja excluir a categoria "${deletingCategoria.nome}"? Esta ação não pode ser desfeita.`
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

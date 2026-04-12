"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Badge,
  Card,
  Input,
  Dialog,
  DialogFooter,
  ConfirmDialog,
} from "@/components/admin";
import {
  createGarcom,
  updateGarcom,
  toggleGarcomAtivo,
  deleteGarcom,
} from "../_actions";
import { toast } from "sonner";
import { Plus, Pencil, Power, Trash2, UserCheck } from "lucide-react";

interface Garcom {
  id: number;
  nome: string;
  codigo: string;
  ativo: boolean;
  createdAt: Date;
}

interface WaitersManagementProps {
  garcons: Garcom[];
}

function WaiterDialog({
  open,
  onOpenChange,
  garcom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  garcom?: Garcom;
}) {
  const [nome, setNome] = useState(garcom?.nome ?? "");
  const [codigo, setCodigo] = useState(garcom?.codigo ?? "");
  const [isPending, startTransition] = useTransition();
  const isEdit = !!garcom;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", nome);
      formData.set("codigo", codigo);
      formData.set("ativo", "true");

      const result = isEdit
        ? await updateGarcom(garcom.id, formData)
        : await createGarcom(formData);

      if (result.success) {
        toast.success(isEdit ? "Garçom atualizado!" : "Garçom adicionado!");
        onOpenChange(false);
        setNome("");
        setCodigo("");
      } else {
        toast.error(result.error ?? "Ocorreu um erro.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Garçom" : "Novo Garçom"}
      description={
        isEdit
          ? "Altere os dados do garçom"
          : "Adicione um novo garçom ao sistema"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          placeholder="Nome do garçom"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <Input
          label="Código"
          placeholder="Código único (ex: G01)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function WaiterRow({ garcom }: { garcom: Garcom }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleGarcomAtivo(garcom.id);
      if (result.success) {
        toast.success(garcom.ativo ? "Garçom desativado." : "Garçom ativado.");
      } else {
        toast.error(result.error ?? "Erro ao alterar status.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGarcom(garcom.id);
      if (result.success) {
        toast.success("Garçom excluído.");
        setDeleteOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao excluir.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-xl border border-onyx-800/70 bg-onyx-800/30 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-medium text-ivory-50">{garcom.nome}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-onyx-400">
                Código: {garcom.codigo}
              </span>
              <Badge variant={garcom.ativo ? "success" : "danger"}>
                {garcom.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={garcom.ativo ? "Desativar" : "Ativar"}
            onClick={handleToggle}
            loading={isPending}
          >
            <Power className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Excluir"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 text-rust-400" />
          </Button>
        </div>
      </div>

      <WaiterDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        garcom={garcom}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir garçom"
        message={`Tem certeza que deseja excluir o garçom "${garcom.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={isPending}
      />
    </>
  );
}

export function WaitersManagement({ garcons }: WaitersManagementProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-ivory-50 font-display">
          Garçons
        </h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {garcons.length === 0 ? (
        <div className="py-8 text-center text-sm text-onyx-400">
          Nenhum garçom cadastrado. Adicione o primeiro.
        </div>
      ) : (
        <div className="space-y-2">
          {garcons.map((garcom) => (
            <WaiterRow key={garcom.id} garcom={garcom} />
          ))}
        </div>
      )}

      <WaiterDialog open={addOpen} onOpenChange={setAddOpen} />
    </Card>
  );
}

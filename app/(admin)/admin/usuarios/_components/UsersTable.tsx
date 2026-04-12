"use client";

import { useTransition } from "react";
import Link from "next/link";
import { DataTable, Badge, Button, type Column } from "@/components/admin";
import { toggleUsuarioAtivo } from "../_actions";
import { toast } from "sonner";
import { Pencil, Power } from "lucide-react";
import type { Usuario } from "@/db/schema";

interface UsersTableProps {
  usuarios: Usuario[];
}

const perfilLabels: Record<string, string> = {
  admin: "Administrador",
  usuario: "Operador",
};

function ToggleButton({ usuario }: { usuario: Usuario }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleUsuarioAtivo(usuario.id);
      if (result.success) {
        toast.success(
          usuario.ativo ? "Usuário desativado." : "Usuário ativado."
        );
      } else {
        toast.error(result.error ?? "Erro ao alterar status.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      loading={isPending}
      title={usuario.ativo ? "Desativar" : "Ativar"}
    >
      <Power className="h-4 w-4" />
    </Button>
  );
}

export function UsersTable({ usuarios }: UsersTableProps) {
  const columns: Column<Usuario>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (row) => (
        <span className="font-medium text-ivory-50">{row.nome}</span>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      render: (row) => row.email,
    },
    {
      key: "perfil",
      header: "Perfil",
      render: (row) => (
        <Badge variant={row.perfil === "admin" ? "info" : "neutral"}>
          {perfilLabels[row.perfil] ?? row.perfil}
        </Badge>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (row) => (
        <Badge variant={row.ativo ? "success" : "danger"}>
          {row.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Criado em",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("pt-BR"),
    },
    {
      key: "acoes",
      header: "Ações",
      className: "w-24",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/admin/usuarios/${row.id}`}>
            <Button variant="ghost" size="icon" title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <ToggleButton usuario={row} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={usuarios}
      keyExtractor={(row) => row.id}
      emptyMessage="Nenhum usuário cadastrado"
    />
  );
}

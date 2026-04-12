import { requireAdmin } from "@/lib/session";
import { PageHeader, Button } from "@/components/admin";
import { EmptyState } from "@/components/admin";
import { getUsuarios } from "./_queries";
import { UsersTable } from "./_components/UsersTable";
import { Users, Plus } from "lucide-react";
import Link from "next/link";

export default async function UsuariosPage() {
  await requireAdmin();

  const usuarios = await getUsuarios();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
      >
        <Link href="/admin/usuarios/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </Link>
      </PageHeader>

      {usuarios.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description="Crie o primeiro usuário para começar."
        >
          <Link href="/admin/usuarios/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <UsersTable usuarios={usuarios} />
      )}
    </div>
  );
}

import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/admin";
import { UserForm } from "../_components/UserForm";
import { createUsuario } from "../_actions";

export default async function NovoUsuarioPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Usuário"
        description="Preencha os dados para criar um novo usuário"
      />
      <UserForm action={createUsuario} />
    </div>
  );
}

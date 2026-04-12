import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/admin";
import { UserForm } from "../_components/UserForm";
import { getUsuarioById } from "../_queries";
import { updateUsuario } from "../_actions";
import { notFound } from "next/navigation";

interface EditUsuarioPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUsuarioPage({ params }: EditUsuarioPageProps) {
  await requireAdmin();

  const { id } = await params;
  const usuario = await getUsuarioById(Number(id));

  if (!usuario) {
    notFound();
  }

  const boundAction = updateUsuario.bind(null, usuario.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Usuário"
        description={`Editando: ${usuario.nome}`}
      />
      <UserForm
        defaultValues={{
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
        }}
        action={boundAction}
        isEdit
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { Button, PageHeader } from "@/components/admin";
import { AbrirCaixaForm } from "../_components/AbrirCaixaForm";
import { getSessaoAberta } from "../_queries";

export default async function NovaSessaoPage() {
  await requireUser();

  const sessaoAberta = await getSessaoAberta();
  if (sessaoAberta) {
    redirect(`/admin/caixa/${sessaoAberta.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/caixa">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Abrir Caixa"
        description="Informe o valor inicial (troco) disponível na gaveta."
      />

      <div className="max-w-xl rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-6 backdrop-blur-sm">
        <AbrirCaixaForm />
      </div>
    </div>
  );
}

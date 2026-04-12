import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Button, Card } from "@/components/admin";
import { getProdutosAtivosParaForm } from "../_queries";
import { StockEntryForm } from "./_components/StockEntryForm";

export default async function EntradaEstoquePage() {
  const produtos = await getProdutosAtivosParaForm();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrada de Estoque"
        description="Registre reposições e compras para atualizar o estoque"
      >
        <Link href="/admin/estoque">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-2xl">
        <StockEntryForm produtos={produtos} />
      </Card>
    </div>
  );
}

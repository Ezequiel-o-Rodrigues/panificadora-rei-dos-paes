import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Button } from "@/components/admin";
import { getEstoqueResumo } from "../_queries";
import { InventoryForm } from "./_components/InventoryForm";

export default async function InventarioPage() {
  const produtos = await getEstoqueResumo();

  const items = produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    categoriaNome: p.categoria.nome,
    estoqueAtual: p.estoqueAtual,
    unidadeMedida: p.unidadeMedida,
    preco: p.preco,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventário Físico"
        description="Ajuste o estoque sistema para refletir a contagem física"
      >
        <Link href="/admin/estoque">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>

      <InventoryForm produtos={items} />
    </div>
  );
}

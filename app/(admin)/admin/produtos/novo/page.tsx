import { PageHeader } from "@/components/admin";
import { getCategoriasAtivas } from "../../categorias/_queries";
import { createProduto } from "../_actions";
import { ProductForm } from "../_components/ProductForm";

export default async function NovoProdutoPage() {
  const categoriasData = await getCategoriasAtivas();
  const categorias = categoriasData.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Produto"
        description="Cadastre um novo produto no catalogo"
      />

      <div className="rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-6 backdrop-blur-sm">
        <ProductForm categorias={categorias} action={createProduto} />
      </div>
    </div>
  );
}

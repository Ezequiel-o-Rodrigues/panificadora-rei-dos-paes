import { Layers } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin";
import { getCategorias, getProductCountByCategory } from "./_queries";
import { CategoriesList } from "./_components/CategoriesList";
import { NewCategoriaButton } from "./_components/NewCategoriaButton";

export const metadata = {
  title: "Categorias | Admin",
};

export default async function CategoriasPage() {
  const [allCategorias, productCounts] = await Promise.all([
    getCategorias(),
    getProductCountByCategory(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Gerencie as categorias de produtos do estabelecimento."
      >
        <NewCategoriaButton />
      </PageHeader>

      {allCategorias.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhuma categoria cadastrada"
          description="Crie a primeira categoria para começar a organizar seus produtos."
        >
          <NewCategoriaButton />
        </EmptyState>
      ) : (
        <CategoriesList
          categorias={allCategorias}
          productCounts={productCounts}
        />
      )}
    </div>
  );
}

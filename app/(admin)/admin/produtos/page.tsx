import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { PageHeader, Button, EmptyState } from "@/components/admin";
import { getProdutos } from "./_queries";
import { getCategoriasAtivas } from "../categorias/_queries";
import { ProductsTable } from "./_components/ProductsTable";

export default async function ProdutosPage() {
  const [produtosData, categoriasData] = await Promise.all([
    getProdutos(),
    getCategoriasAtivas(),
  ]);

  const categorias = categoriasData.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" description="Gerencie o catálogo de produtos do estabelecimento">
        <Link href="/admin/produtos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </Link>
      </PageHeader>

      {produtosData.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          description="Comece adicionando o primeiro produto ao catalogo."
        >
          <Link href="/admin/produtos/novo">
            <Button>
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <ProductsTable produtos={produtosData} categorias={categorias} />
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { getProdutoById } from "../_queries";
import { getCategoriasAtivas } from "../../categorias/_queries";
import { updateProduto } from "../_actions";
import { ProductForm } from "../_components/ProductForm";

interface EditProdutoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProdutoPage({ params }: EditProdutoPageProps) {
  const { id } = await params;
  const produtoId = Number(id);

  if (Number.isNaN(produtoId)) {
    redirect("/admin/produtos");
  }

  const [produto, categoriasData] = await Promise.all([
    getProdutoById(produtoId),
    getCategoriasAtivas(),
  ]);

  if (!produto) {
    redirect("/admin/produtos");
  }

  const categorias = categoriasData.map((c) => ({ id: c.id, nome: c.nome }));

  const boundAction = async (formData: FormData) => {
    "use server";
    return updateProduto(produtoId, formData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar: ${produto.nome}`}
        description="Altere as informacoes do produto"
      />

      <div className="rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-6 backdrop-blur-sm">
        <ProductForm
          categorias={categorias}
          imagemUrl={produto.imagemUrl}
          defaultValues={{
            nome: produto.nome,
            categoriaId: produto.categoriaId,
            descricao: produto.descricao ?? "",
            preco: produto.preco,
            estoqueMinimo: produto.estoqueMinimo,
            unidadeMedida: produto.unidadeMedida,
            pesoGramas: produto.pesoGramas ?? undefined,
            disponivelHoje: produto.disponivelHoje,
            destaque: produto.destaque,
            ativo: produto.ativo,
          }}
          action={boundAction}
        />
      </div>
    </div>
  );
}

import { DollarSign, Package, ShoppingBag } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import {
  getCategoriasAtivas,
  getRelatorioProdutosVendidos,
  getResumoProdutos,
} from "../_queries";
import { formatQty, parseDateRange } from "../_helpers";
import { DateRangeClient } from "../_components/DateRangeClient";
import { CategoriaFilter } from "./_components/CategoriaFilter";
import { ProductsReportClient } from "./_components/ProductsReportClient";

type SearchParams = Promise<{
  startDate?: string;
  endDate?: string;
  categoriaId?: string;
}>;

export default async function RelatorioProdutosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const params = await searchParams;
  const range = parseDateRange(params);

  let categoriaId: number | undefined;
  if (params.categoriaId) {
    const n = Number(params.categoriaId);
    if (!Number.isNaN(n) && n > 0) categoriaId = n;
  }

  const [produtos, resumo, categorias] = await Promise.all([
    getRelatorioProdutosVendidos(range, categoriaId),
    getResumoProdutos(range),
    getCategoriasAtivas(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos Mais Vendidos"
        description="Ranking de produtos por faturamento e quantidade vendida."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
        <DateRangeClient
          startDate={range.startDate}
          endDate={range.endDate}
          extraParams={{ categoriaId: categoriaId?.toString() }}
        />
        <div className="ml-auto w-full max-w-[260px]">
          <CategoriaFilter
            categorias={categorias}
            value={categoriaId?.toString() ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Itens vendidos"
          value={formatQty(resumo.totalProdutosVendidos)}
          icon={ShoppingBag}
          description="Soma de quantidades"
        />
        <StatCard
          title="Faturamento"
          value={formatBRL(resumo.totalValor)}
          icon={DollarSign}
          description="Soma dos subtotais"
        />
        <StatCard
          title="Produtos distintos"
          value={resumo.totalProdutosDistintos.toLocaleString("pt-BR")}
          icon={Package}
          description="Produtos diferentes vendidos"
        />
      </div>

      <ProductsReportClient data={produtos} range={range} />
    </div>
  );
}

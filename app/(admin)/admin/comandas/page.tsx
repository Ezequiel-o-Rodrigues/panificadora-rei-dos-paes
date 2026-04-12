import { Receipt, DollarSign, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/session";
import { PageHeader, StatCard, EmptyState } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import {
  getComandas,
  getResumoFiltros,
  type ComandaFilters,
} from "./_queries";
import { ComandaFilters as ComandaFiltersComponent } from "./_components/ComandaFilters";
import { ComandasTable } from "./_components/ComandasTable";

type SearchParams = Promise<{
  status?: string;
  garcomId?: string;
  formaPagamento?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}>;

const VALID_STATUS: ReadonlySet<string> = new Set([
  "aberta",
  "finalizada",
  "cancelada",
]);
const VALID_FORMA_PAGAMENTO: ReadonlySet<string> = new Set([
  "dinheiro",
  "debito",
  "credito",
  "pix",
  "voucher",
  "outro",
]);

function parseFilters(params: Awaited<SearchParams>): ComandaFilters {
  const filters: ComandaFilters = {};

  if (params.status && VALID_STATUS.has(params.status)) {
    filters.status = params.status as ComandaFilters["status"];
  }

  if (params.garcomId) {
    const n = Number(params.garcomId);
    if (!Number.isNaN(n) && n > 0) filters.garcomId = n;
  }

  if (
    params.formaPagamento &&
    VALID_FORMA_PAGAMENTO.has(params.formaPagamento)
  ) {
    filters.formaPagamento =
      params.formaPagamento as ComandaFilters["formaPagamento"];
  }

  if (params.startDate) filters.startDate = params.startDate;
  if (params.endDate) filters.endDate = params.endDate;
  if (params.search) filters.search = params.search;

  return filters;
}

export default async function ComandasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const params = await searchParams;
  const filters = parseFilters(params);

  const [comandasData, resumo] = await Promise.all([
    getComandas(filters),
    getResumoFiltros(),
  ]);

  const totalComandas = comandasData.length;
  const finalizadas = comandasData.filter((c) => c.status === "finalizada");
  const totalFinalizadas = finalizadas.length;
  const totalVendas = finalizadas.reduce(
    (sum, c) => sum + Number(c.valorTotal),
    0,
  );
  const ticketMedio = totalFinalizadas > 0 ? totalVendas / totalFinalizadas : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comandas"
        description="Histórico de todas as comandas abertas, finalizadas e canceladas"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total de comandas"
          value={totalComandas.toLocaleString("pt-BR")}
          icon={Receipt}
          description={`${totalFinalizadas} finalizada(s)`}
        />
        <StatCard
          title="Total de vendas"
          value={formatBRL(totalVendas)}
          icon={DollarSign}
          description="Somente comandas finalizadas"
        />
        <StatCard
          title="Ticket médio"
          value={formatBRL(ticketMedio)}
          icon={TrendingUp}
          description="Vendas / comandas finalizadas"
        />
      </div>

      <ComandaFiltersComponent
        garcons={resumo.garcons}
        formasPagamento={resumo.formasPagamento}
      />

      {comandasData.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma comanda encontrada"
          description="Ajuste os filtros ou aguarde o lançamento de novas comandas."
        />
      ) : (
        <ComandasTable comandas={comandasData} />
      )}
    </div>
  );
}

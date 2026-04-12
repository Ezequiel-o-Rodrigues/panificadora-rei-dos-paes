import { DollarSign, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import {
  getRelatorioVendasPeriodo,
  getResumoVendas,
  getVendasPorFormaPagamento,
} from "../_queries";
import { parseDateRange, parseGranularity } from "../_helpers";
import { DateRangeClient } from "../_components/DateRangeClient";
import { GranularitySelect } from "./_components/GranularitySelect";
import { SalesReportClient } from "./_components/SalesReportClient";

type SearchParams = Promise<{
  startDate?: string;
  endDate?: string;
  granularity?: string;
}>;

export default async function RelatorioVendasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const params = await searchParams;
  const range = parseDateRange(params);
  const granularity = parseGranularity(params.granularity);

  const [vendasPeriodo, formasPagamento, resumo] = await Promise.all([
    getRelatorioVendasPeriodo(range, granularity),
    getVendasPorFormaPagamento(range),
    getResumoVendas(range),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório de Vendas"
        description="Evolução de vendas finalizadas, ticket médio e formas de pagamento."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
        <DateRangeClient
          startDate={range.startDate}
          endDate={range.endDate}
          extraParams={{ granularity }}
        />
        <div className="ml-auto w-full max-w-[180px]">
          <GranularitySelect value={granularity} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de comandas"
          value={resumo.totalComandas.toLocaleString("pt-BR")}
          icon={Receipt}
          description="Comandas finalizadas no período"
        />
        <StatCard
          title="Total de vendas"
          value={formatBRL(resumo.totalVendas)}
          icon={DollarSign}
          description="Soma do valor total"
        />
        <StatCard
          title="Gorjetas"
          value={formatBRL(resumo.totalGorjetas)}
          icon={Sparkles}
          description="Soma da taxa de gorjeta"
        />
        <StatCard
          title="Ticket médio"
          value={formatBRL(resumo.ticketMedio)}
          icon={TrendingUp}
          description="Vendas / comandas"
        />
      </div>

      <SalesReportClient
        data={vendasPeriodo}
        formasPagamento={formasPagamento}
        granularity={granularity}
        range={range}
      />
    </div>
  );
}

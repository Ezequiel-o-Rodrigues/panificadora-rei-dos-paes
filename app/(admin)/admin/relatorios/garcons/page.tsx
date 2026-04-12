import { Award, DollarSign, TrendingUp, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import {
  calcComissaoGarcom,
  calcDesempenhoGarcom,
  type ClassificacaoGarcom,
} from "@/lib/calculations";
import {
  getMediaGeralComandas,
  getRelatorioDesempenhoGarcons,
  getTaxaComissaoGarcom,
} from "../_queries";
import { parseDateRange } from "../_helpers";
import { DateRangeClient } from "../_components/DateRangeClient";
import { WaitersReportClient } from "./_components/WaitersReportClient";

type SearchParams = Promise<{
  startDate?: string;
  endDate?: string;
}>;

export interface DesempenhoGarcomComputed {
  garcomId: number;
  nome: string;
  codigo: string;
  totalComandas: number;
  totalVendas: number;
  totalGorjetas: number;
  ticketMedio: number;
  ratio: number;
  classificacao: ClassificacaoGarcom;
  comissao: number;
}

export default async function RelatorioGarconsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const params = await searchParams;
  const range = parseDateRange(params);

  const [desempenho, mediaGeral, taxaComissao] = await Promise.all([
    getRelatorioDesempenhoGarcons(range),
    getMediaGeralComandas(range),
    getTaxaComissaoGarcom(),
  ]);

  // Enriquece os dados com classificação e comissão usando as funções
  // puras de lib/calculations. A média usada como referência é o ticket
  // médio geral (vendas totais / comandas totais), comparada ao ticket
  // médio do garçom. Isso reflete qualidade e não apenas volume.
  const rows: DesempenhoGarcomComputed[] = desempenho.map((row) => {
    const { ratio, classificacao } = calcDesempenhoGarcom(
      row.ticketMedio,
      mediaGeral.mediaTicketMedio,
    );
    const comissaoStr = calcComissaoGarcom(row.totalVendas, taxaComissao);
    return {
      ...row,
      ratio,
      classificacao,
      comissao: Number(comissaoStr),
    };
  });

  const totalComissoes = rows.reduce((acc, r) => acc + r.comissao, 0);
  const topPerformer = rows[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Desempenho dos Garçons"
        description="Comparativo de vendas, ticket médio, classificação e comissões por garçom."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
        <DateRangeClient
          startDate={range.startDate}
          endDate={range.endDate}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Garçons ativos"
          value={mediaGeral.totalGarconsAtivos.toLocaleString("pt-BR")}
          icon={Users}
          description={`${mediaGeral.totalComandasGeral} comandas totais`}
        />
        <StatCard
          title="Ticket médio geral"
          value={formatBRL(mediaGeral.mediaTicketMedio)}
          icon={TrendingUp}
          description="Referência para comparação"
        />
        <StatCard
          title="Top performer"
          value={topPerformer?.nome ?? "—"}
          icon={Award}
          description={
            topPerformer
              ? `${formatBRL(topPerformer.totalVendas)} em vendas`
              : "Sem dados"
          }
        />
        <StatCard
          title="Total em comissões"
          value={formatBRL(totalComissoes)}
          icon={DollarSign}
          description={`Taxa: ${(taxaComissao * 100).toFixed(2)}%`}
        />
      </div>

      <WaitersReportClient
        data={rows}
        taxaComissao={taxaComissao}
        mediaTicketMedio={mediaGeral.mediaTicketMedio}
        range={range}
      />
    </div>
  );
}

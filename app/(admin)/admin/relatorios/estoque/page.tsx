import { AlertTriangle, Boxes, Info, TrendingDown } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import {
  getRelatorioAnaliseEstoque,
  getResumoAnaliseEstoque,
} from "../_queries";
import { formatQty, parseDateRange } from "../_helpers";
import { DateRangeClient } from "../_components/DateRangeClient";
import { StockAnalysisClient } from "./_components/StockAnalysisClient";

type SearchParams = Promise<{
  startDate?: string;
  endDate?: string;
}>;

export default async function RelatorioEstoquePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const params = await searchParams;
  const range = parseDateRange(params);

  const [linhas, resumo] = await Promise.all([
    getRelatorioAnaliseEstoque(range),
    getResumoAnaliseEstoque(range),
  ]);

  const temPerdas = resumo.totalProdutosComPerda > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Estoque e Perdas"
        description="Reconstrução do estoque teórico a partir das movimentações e detecção de perdas."
      />

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
        <DateRangeClient
          startDate={range.startDate}
          endDate={range.endDate}
        />
      </div>

      <div className="rounded-2xl border border-flame-500/30 bg-flame-500/5 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-flame-400" />
          <div className="text-sm text-onyx-200">
            <p className="font-medium text-ivory-50">
              Como funciona este relatório
            </p>
            <p className="mt-1 text-xs text-onyx-300">
              Para cada produto ativo, o estoque inicial é reconstruído a
              partir do estoque atual descontando entradas e somando saídas
              registradas no período. O estoque teórico é então{" "}
              <strong className="text-ivory-50">
                estoqueInicial + entradas − saídas + ajustes
              </strong>
              . A perda é a diferença positiva entre o estoque teórico e o
              estoque real, indicando quebras, furtos ou alterações manuais
              fora do fluxo de movimentações.
            </p>
          </div>
        </div>
      </div>

      {temPerdas && (
        <div className="rounded-2xl border border-rust-500/40 bg-rust-500/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rust-400" />
            <div className="text-sm">
              <p className="font-semibold text-rust-300">
                Perdas detectadas no período
              </p>
              <p className="mt-1 text-xs text-onyx-200">
                {resumo.totalProdutosComPerda} produto(s) com perda totalizando{" "}
                <strong className="text-ivory-50">
                  {formatBRL(resumo.valorTotalPerdas)}
                </strong>
                . Verifique os registros destacados na tabela abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produtos analisados"
          value={resumo.totalProdutosAnalisados.toLocaleString("pt-BR")}
          icon={Boxes}
          description="Produtos ativos"
        />
        <StatCard
          title="Produtos com perda"
          value={resumo.totalProdutosComPerda.toLocaleString("pt-BR")}
          icon={AlertTriangle}
          description="Diferença teórico vs real"
        />
        <StatCard
          title="Unidades perdidas"
          value={formatQty(resumo.totalUnidadesPerdidas)}
          icon={TrendingDown}
          description="Soma das diferenças"
        />
        <StatCard
          title="Valor total das perdas"
          value={formatBRL(resumo.valorTotalPerdas)}
          icon={TrendingDown}
          description="Calculado pelo preço atual"
        />
      </div>

      <StockAnalysisClient data={linhas} range={range} />
    </div>
  );
}

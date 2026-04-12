import Link from "next/link";
import { PlayCircle, Plus, ShoppingCart } from "lucide-react";
import { requireUser } from "@/lib/session";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/db";
import { comandas } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSessaoAberta, getSessoes } from "./_queries";

export default async function CaixaPage() {
  await requireUser();

  const [sessaoAberta, sessoes] = await Promise.all([
    getSessaoAberta(),
    getSessoes(20),
  ]);

  // Total de vendas finalizadas por sessão (para mostrar na listagem)
  const sessaoIds = sessoes.map((s) => s.id);
  const totaisPorSessao: Record<number, number> = {};

  if (sessaoIds.length > 0) {
    const rows = await db
      .select({
        caixaSessaoId: comandas.caixaSessaoId,
        total: sql<string>`COALESCE(SUM(${comandas.valorTotal}), 0)::text`,
      })
      .from(comandas)
      .where(
        and(
          inArray(comandas.caixaSessaoId, sessaoIds),
          eq(comandas.status, "finalizada"),
        ),
      )
      .groupBy(comandas.caixaSessaoId);

    for (const r of rows) {
      if (r.caixaSessaoId != null) {
        totaisPorSessao[r.caixaSessaoId] = Number(r.total ?? 0);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caixa / PDV"
        description="Gerencie sessões de caixa e abra o ponto de venda"
      />

      {sessaoAberta ? (
        <Card className="flex flex-col gap-4 border-flame-500/30 bg-flame-500/5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Sessão aberta</Badge>
              <span className="text-sm text-onyx-300">
                #{sessaoAberta.id} — desde{" "}
                {formatDateTime(sessaoAberta.dataAbertura)}
              </span>
            </div>
            <div className="mt-2 text-lg font-semibold text-ivory-50">
              Caixa ativo com valor de abertura{" "}
              {formatBRL(sessaoAberta.valorAbertura)}
            </div>
            <div className="mt-1 text-xs text-onyx-400">
              Aberto por {sessaoAberta.usuarioAbertura?.nome ?? "--"}
            </div>
          </div>
          <Link href={`/admin/caixa/${sessaoAberta.id}`}>
            <Button size="lg">
              <PlayCircle className="h-5 w-5" />
              Abrir PDV
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-ivory-50">
              Nenhuma sessão de caixa aberta
            </div>
            <p className="mt-1 text-sm text-onyx-400">
              Abra uma nova sessão para começar a operar o PDV.
            </p>
          </div>
          <Link href="/admin/caixa/nova-sessao">
            <Button size="lg">
              <Plus className="h-5 w-5" />
              Abrir novo caixa
            </Button>
          </Link>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ivory-50 font-display">
          Sessões recentes
        </h2>

        {sessoes.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhuma sessão registrada"
            description="As sessões de caixa aparecerão aqui quando forem abertas."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-onyx-800/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Abertura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Valor abertura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Total vendas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Valor fechamento
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-onyx-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-onyx-800/40">
                {sessoes.map((s) => {
                  const total = totaisPorSessao[s.id] ?? 0;
                  return (
                    <tr key={s.id} className="transition hover:bg-onyx-800/40">
                      <td className="px-4 py-3 font-semibold text-ivory-50">
                        #{s.id}
                      </td>
                      <td className="px-4 py-3 text-onyx-200">
                        {formatDateTime(s.dataAbertura)}
                      </td>
                      <td className="px-4 py-3 text-onyx-200">
                        {s.usuarioAbertura?.nome ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-onyx-200">
                        {formatBRL(s.valorAbertura)}
                      </td>
                      <td className="px-4 py-3">
                        {s.status === "aberta" ? (
                          <Badge variant="success">Aberta</Badge>
                        ) : (
                          <Badge variant="neutral">Fechada</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">
                        {formatBRL(total)}
                      </td>
                      <td className="px-4 py-3 text-onyx-200">
                        {s.valorFechamento
                          ? formatBRL(s.valorFechamento)
                          : "--"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/caixa/${s.id}`}>
                          <Button size="sm" variant="outline">
                            {s.status === "aberta" ? "Continuar" : "Ver"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

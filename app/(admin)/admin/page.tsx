import { AlertTriangle, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { MonthlySalesChart } from "./_components/MonthlySalesChart";
import { RecentOrdersList } from "./_components/RecentOrdersList";
import { SalesChart } from "./_components/SalesChart";
import { TopCategoriasChart } from "./_components/TopCategoriasChart";
import {
  getComandasAbertas,
  getComandasRecentes,
  getEstoqueCritico,
  getResumoVendasMes,
  getTopCategorias,
  getTotalProdutosAtivos,
  getVendasHoje,
  getVendasMensais,
  getVendasUltimos7Dias,
} from "./_queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireUser();

  const anoAtual = new Date().getFullYear();

  const [
    vendasHoje,
    comandasAbertas,
    produtosAtivos,
    estoqueCritico,
    vendas7d,
    topCategorias,
    vendasMensais,
    comandasRecentes,
    resumoMes,
  ] = await Promise.all([
    getVendasHoje(),
    getComandasAbertas(),
    getTotalProdutosAtivos(),
    getEstoqueCritico(),
    getVendasUltimos7Dias(),
    getTopCategorias(8),
    getVendasMensais(anoAtual),
    getComandasRecentes(10),
    getResumoVendasMes(),
  ]);

  const estoqueCriticoDescricao =
    estoqueCritico > 0
      ? "Produtos abaixo do estoque mínimo"
      : "Nenhum produto em alerta";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua panificadora"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vendas hoje"
          value={formatBRL(vendasHoje)}
          icon={TrendingUp}
          description={`${formatBRL(resumoMes.totalVendas)} no mês`}
        />
        <StatCard
          title="Comandas abertas"
          value={comandasAbertas.toLocaleString("pt-BR")}
          icon={ShoppingCart}
          description={`${resumoMes.totalComandas} finalizadas no mês`}
        />
        <StatCard
          title="Produtos ativos"
          value={produtosAtivos.toLocaleString("pt-BR")}
          icon={Package}
          description={`Ticket médio: ${formatBRL(resumoMes.ticketMedio)}`}
        />
        <StatCard
          title="Estoque crítico"
          value={estoqueCritico.toLocaleString("pt-BR")}
          icon={AlertTriangle}
          description={estoqueCriticoDescricao}
          className={
            estoqueCritico > 0
              ? "border-rust-500/40 ring-1 ring-rust-500/20"
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <SalesChart data={vendas7d} />
        </div>
        <div className="md:col-span-1">
          <TopCategoriasChart data={topCategorias} />
        </div>
      </div>

      <MonthlySalesChart data={vendasMensais} ano={anoAtual} />

      <RecentOrdersList comandas={comandasRecentes} />
    </div>
  );
}

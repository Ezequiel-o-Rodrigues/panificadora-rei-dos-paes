import Link from "next/link";
import {
  Boxes,
  AlertTriangle,
  DollarSign,
  Eye,
  PackagePlus,
  ClipboardCheck,
  TrendingDown,
} from "lucide-react";
import {
  PageHeader,
  Button,
  StatCard,
  EmptyState,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import {
  getEstoqueResumo,
  getMovimentacoes,
  getResumoEstoque,
} from "./_queries";
import { StockTable } from "./_components/StockTable";
import { StockAlertBanner } from "./_components/StockAlertBanner";
import { MovimentacoesHistorico } from "./_components/MovimentacoesHistorico";

export default async function EstoquePage() {
  const [resumo, produtosComEstoque, movimentacoes] = await Promise.all([
    getResumoEstoque(),
    getEstoqueResumo(),
    getMovimentacoes(),
  ]);

  const categoriasMap = new Map<number, string>();
  for (const p of produtosComEstoque) {
    categoriasMap.set(p.categoriaId, p.categoria.nome);
  }
  const categorias = Array.from(categoriasMap.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Controle de entradas, inventário e perdas"
      >
        <Link href="/admin/estoque/entrada">
          <Button variant="secondary">
            <PackagePlus className="h-4 w-4" />
            Entrada
          </Button>
        </Link>
        <Link href="/admin/estoque/inventario">
          <Button variant="secondary">
            <ClipboardCheck className="h-4 w-4" />
            Inventário
          </Button>
        </Link>
        <Link href="/admin/estoque/perdas">
          <Button variant="secondary">
            <TrendingDown className="h-4 w-4" />
            Perdas
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produtos ativos"
          value={resumo.totalProdutos}
          icon={Boxes}
          description="Total no catálogo"
        />
        <StatCard
          title="Estoque crítico"
          value={resumo.totalEstoqueCritico}
          icon={AlertTriangle}
          description="Abaixo ou igual ao mínimo"
        />
        <StatCard
          title="Valor em estoque"
          value={formatBRL(resumo.valorTotalEstoque)}
          icon={DollarSign}
          description="Soma do estoque atual"
        />
        <StatCard
          title="Perdas pendentes"
          value={resumo.totalPerdasNaoVisualizadas}
          icon={Eye}
          description="Não visualizadas"
        />
      </div>

      {resumo.totalEstoqueCritico > 0 && (
        <StockAlertBanner count={resumo.totalEstoqueCritico} />
      )}

      {produtosComEstoque.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum produto cadastrado"
          description="Cadastre produtos para começar a controlar o estoque."
        >
          <Link href="/admin/produtos/novo">
            <Button>Novo Produto</Button>
          </Link>
        </EmptyState>
      ) : (
        <>
          <StockTable produtos={produtosComEstoque} categorias={categorias} />
          <MovimentacoesHistorico movimentacoes={movimentacoes} />
        </>
      )}
    </div>
  );
}

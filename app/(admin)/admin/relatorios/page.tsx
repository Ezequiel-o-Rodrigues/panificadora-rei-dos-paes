import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/admin";
import { requireUser } from "@/lib/session";

interface ReportCard {
  href: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
}

const cards: ReportCard[] = [
  {
    href: "/admin/relatorios/vendas",
    title: "Vendas",
    description:
      "Evolução de vendas por período, formas de pagamento e ticket médio.",
    icon: TrendingUp,
  },
  {
    href: "/admin/relatorios/produtos",
    title: "Produtos vendidos",
    description:
      "Ranking de produtos mais vendidos por quantidade e faturamento.",
    icon: ShoppingBag,
  },
  {
    href: "/admin/relatorios/estoque",
    title: "Análise de estoque",
    description:
      "Reconstrução de estoque teórico e detecção de perdas no período.",
    icon: Boxes,
  },
  {
    href: "/admin/relatorios/garcons",
    title: "Desempenho dos garçons",
    description:
      "Comparação de vendas, ticket médio e comissões por garçom.",
    icon: Users,
  },
];

export default async function RelatoriosHubPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Inteligência de negócio da panificadora: vendas, produtos, estoque e desempenho."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-6 backdrop-blur-sm transition hover:border-flame-500/40 hover:bg-onyx-900/80"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30 transition group-hover:bg-flame-500/20">
                <Icon className="h-5 w-5" />
              </div>
              <BarChart3 className="h-4 w-4 text-onyx-500 transition group-hover:text-flame-400" />
            </div>
            <h3 className="font-display text-lg font-bold text-ivory-50">
              {title}
            </h3>
            <p className="text-sm text-onyx-300">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { BarChart3, Package, Receipt, TrendingUp } from "lucide-react";

const stats = [
  { label: "Vendas hoje", value: "R$ 0,00", icon: TrendingUp },
  { label: "Comandas abertas", value: "0", icon: Receipt },
  { label: "Produtos ativos", value: "—", icon: Package },
  { label: "Estoque crítico", value: "0", icon: BarChart3 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-onyx-300">
          Visão geral da panificadora hoje.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-5 shadow-deep backdrop-blur-sm transition hover:border-flame-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-onyx-400">
                {label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400 ring-1 ring-flame-500/30">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-bold text-ivory-50">
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-onyx-800/70 bg-onyx-900/60 p-8 shadow-deep backdrop-blur-sm">
        <h2 className="font-display text-xl font-bold text-ivory-50">
          Próximos passos
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-onyx-200">
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 0 concluída: projeto inicializado, auth configurado, schema pronto.
          </li>
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 1: CRUD de produtos, categorias, estoque, usuários.
          </li>
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 2: PDV completo com caixa, comandas e comprovantes.
          </li>
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 3: Cardápio público mobile-first.
          </li>
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 4: Camada 3D (Three.js / R3F).
          </li>
          <li>
            <span className="mr-2 text-flame-400">•</span>
            Fase 5: Relatórios, PWA e deploy.
          </li>
        </ul>
      </div>
    </div>
  );
}

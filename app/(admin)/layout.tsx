import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChefHat,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { auth } from "@/lib/auth";

const menu = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/caixa", label: "Caixa / PDV", icon: ShoppingCart },
  { href: "/admin/comandas", label: "Comandas", icon: Receipt },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-onyx-800/70 bg-onyx-950/80 backdrop-blur-xl md:flex md:flex-col">
        <div className="border-b border-onyx-800/70 px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {menu.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-onyx-200 transition hover:bg-onyx-800/80 hover:text-flame-400"
            >
              <Icon className="h-4 w-4 text-flame-500/80" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-onyx-800/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-flame-400 to-rust-600 text-onyx-950 shadow-flame">
              <ChefHat className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ivory-50">
                {session.user.name ?? "Operador"}
              </div>
              <div className="truncate text-xs text-onyx-400">
                {session.user.email}
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-onyx-800/70 bg-onyx-950/80 px-4 backdrop-blur-xl md:px-8">
          <Link href="/admin" className="md:hidden">
            <Logo hideSubtitle />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold text-flame-300 transition hover:bg-flame-500/20"
            >
              Ver site público
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

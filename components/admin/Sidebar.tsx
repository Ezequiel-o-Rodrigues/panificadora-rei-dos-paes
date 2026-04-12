"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

interface MenuItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const MENU: MenuItem[] = [
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

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {MENU.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-flame-500/15 text-flame-400 border border-flame-500/20"
                : "text-onyx-200 hover:bg-onyx-800/80 hover:text-flame-400"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isActive ? "text-flame-400" : "text-flame-500/80"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

interface MobileMenuButtonProps {
  userName?: string;
  userEmail?: string;
}

export function MobileMenuButton({ userName, userEmail }: MobileMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-onyx-300 hover:bg-onyx-800 hover:text-ivory-50 transition md:hidden cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-onyx-950 border-r border-onyx-800/70 flex flex-col">
            <div className="flex items-center justify-between border-b border-onyx-800/70 px-5 py-4">
              <span className="text-lg font-bold text-flame-400 font-display">
                Menu
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-onyx-400 hover:bg-onyx-800 hover:text-ivory-50 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {MENU.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "bg-flame-500/15 text-flame-400 border border-flame-500/20"
                        : "text-onyx-200 hover:bg-onyx-800/80 hover:text-flame-400"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-flame-400" : "text-flame-500/80"
                      )}
                    />
                    {label}
                  </Link>
                );
              })}
            </nav>
            {userName && (
              <div className="border-t border-onyx-800/70 px-5 py-4">
                <div className="text-sm font-semibold text-ivory-50">
                  {userName}
                </div>
                <div className="text-xs text-onyx-400">{userEmail}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

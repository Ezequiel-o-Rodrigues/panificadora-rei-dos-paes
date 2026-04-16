import Link from "next/link";
import { redirect } from "next/navigation";
import { ChefHat } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { SidebarNav, MobileMenuButton } from "@/components/admin/Sidebar";
import { AdminShell } from "@/components/admin/AdminShell";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userName = session.user.name ?? "Operador";
  const userEmail = session.user.email ?? "";

  const sidebar = (
    <>
      <div className="border-b border-onyx-800/70 px-5 py-5">
        <Logo />
      </div>
      <SidebarNav />
      <div className="border-t border-onyx-800/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-flame-400 to-rust-600 text-onyx-950 shadow-flame">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ivory-50">
              {userName}
            </div>
            <div className="truncate text-xs text-onyx-400">
              {userEmail}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const header = (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-onyx-800/70 bg-onyx-950/80 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3 md:hidden">
        <MobileMenuButton userName={userName} userEmail={userEmail} />
        <Link href="/admin">
          <Logo hideSubtitle />
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold text-flame-300 transition hover:bg-flame-500/20"
        >
          Ver site público
        </Link>
      </div>
    </header>
  );

  return (
    <AdminShell sidebar={sidebar} header={header}>
      {children}
    </AdminShell>
  );
}

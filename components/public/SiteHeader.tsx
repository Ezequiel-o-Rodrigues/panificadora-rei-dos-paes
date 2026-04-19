import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-flame-500/20">
      <div className="glass absolute inset-0 -z-10" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo hideSubtitle />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-onyx-700 transition hover:bg-flame-500/10 hover:text-flame-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/cardapio"
          className="hidden rounded-full bg-gradient-to-br from-flame-400 via-flame-500 to-rust-500 px-5 py-2 text-sm font-bold text-white shadow-flame transition hover:brightness-110 md:inline-flex"
        >
          Ver cardápio
        </Link>
      </div>
    </header>
  );
}

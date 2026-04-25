import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { InstagramIcon } from "@/components/shared/icons";
import { TENANT_CONFIG } from "@/lib/config/tenant";

export function SiteFooter() {
  const instagramHandle = TENANT_CONFIG.contato.instagram;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${instagramHandle.replace(/^@/, "")}/`
    : null;
  return (
    <footer className="relative mt-24 overflow-hidden bg-gradient-to-b from-onyx-900 via-onyx-950 to-onyx-900 text-ivory-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-flame-500/20 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-onyx-200">
            {TENANT_CONFIG.metatags.descricao}
          </p>
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold text-flame-300 transition hover:border-flame-500 hover:bg-flame-500/20"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              {instagramHandle}
            </a>
          )}
        </div>
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-flame-400">
            Navegação
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-onyx-200">
            <li><Link href="/" className="transition hover:text-flame-300">Início</Link></li>
            <li><Link href="/cardapio" className="transition hover:text-flame-300">Cardápio</Link></li>
            <li><Link href="/sobre" className="transition hover:text-flame-300">Sobre</Link></li>
            <li><Link href="/contato" className="transition hover:text-flame-300">Contato</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-flame-400">
            Horário
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-onyx-200">
            <li>Seg a Sáb · 6h às 20h</li>
            <li>Domingo · 7h às 13h</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-flame-400">
            Contato
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-onyx-200">
            <li>Pronta entrega no balcão</li>
            {TENANT_CONFIG.contato.telefone && (
              <li>{TENANT_CONFIG.contato.telefone}</li>
            )}
          </ul>
        </div>
      </div>
      <div className="relative border-t border-onyx-800/70 py-6 text-center text-xs text-onyx-400">
        © {new Date().getFullYear()} {TENANT_CONFIG.nome}. Todos os direitos reservados.
      </div>
    </footer>
  );
}

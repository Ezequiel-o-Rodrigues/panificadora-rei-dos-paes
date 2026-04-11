import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { InstagramIcon } from "@/components/shared/icons";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-onyx-800/70 bg-gradient-to-b from-transparent via-onyx-950 to-onyx-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-onyx-300">
            Pães artesanais, doces e salgados fresquinhos todos os dias, feitos
            com ingredientes selecionados e fornada quente.
          </p>
          <a
            href="https://www.instagram.com/reidospaes_1/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold text-flame-300 transition hover:border-flame-500 hover:bg-flame-500/20"
          >
            <InstagramIcon className="h-3.5 w-3.5" />
            @reidospaes_1
          </a>
        </div>
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-flame-400">
            Navegação
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-onyx-200">
            <li><Link href="/" className="transition hover:text-flame-400">Início</Link></li>
            <li><Link href="/cardapio" className="transition hover:text-flame-400">Cardápio</Link></li>
            <li><Link href="/sobre" className="transition hover:text-flame-400">Sobre</Link></li>
            <li><Link href="/contato" className="transition hover:text-flame-400">Contato</Link></li>
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
            <li>(11) 99999-9999</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-onyx-800/70 py-6 text-center text-xs text-onyx-400">
        © {new Date().getFullYear()} Panificadora Rei dos Pães. Todos os direitos reservados.
      </div>
    </footer>
  );
}

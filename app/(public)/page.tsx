import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Flame, MapPin } from "lucide-react";
import { InstagramIcon } from "@/components/shared/icons";
import { HAS_LOGO_FILE } from "@/components/shared/Logo";
import { TENANT_CONFIG, getHeroContent } from "@/lib/config/tenant";

export default function HomePage() {
  const instagramHandle = TENANT_CONFIG.contato.instagram;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${instagramHandle.replace(/^@/, "")}/`
    : null;
  const hero = getHeroContent();

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-flame-500/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-40 -z-10 h-[400px] w-[400px] rounded-full bg-rust-600/25 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 md:pt-20 lg:grid-cols-2 lg:pt-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-flame-300 backdrop-blur">
              <Flame className="h-3.5 w-3.5 animate-flicker" />
              {hero.tagline}
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] text-ivory-50 sm:text-6xl lg:text-7xl">
              {hero.titulo}
              <br />
              <span className="text-gradient-flame">{hero.tituloDestaque}</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-onyx-200 sm:text-lg">
              {hero.descricao} Na{" "}
              <strong className="text-flame-400">{TENANT_CONFIG.nome}</strong>,
              cada detalhe faz a diferença.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cardapio"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-flame-400 via-flame-500 to-rust-600 px-7 py-3.5 text-sm font-bold text-onyx-950 shadow-flame transition hover:shadow-glow-lg"
              >
                Ver cardápio
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-onyx-900/60 px-6 py-3.5 text-sm font-semibold text-ivory-50 backdrop-blur transition hover:border-flame-500 hover:bg-onyx-800"
                >
                  <InstagramIcon className="h-4 w-4" />
                  {instagramHandle}
                </a>
              )}
            </div>
            {TENANT_CONFIG.contato.telefone && (
              <div className="mt-10 grid grid-cols-2 gap-4 text-sm sm:max-w-md">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-flame-500/10 p-2 text-flame-400 ring-1 ring-flame-500/30">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-ivory-50">Aberto agora</div>
                    <div className="text-xs text-onyx-300">Confira nosso horário</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-flame-500/10 p-2 text-flame-400 ring-1 ring-flame-500/30">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-ivory-50">
                      {TENANT_CONFIG.contato.telefone}
                    </div>
                    <div className="text-xs text-onyx-300">Ligue ou visite</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-flame-500/40 via-rust-600/25 to-transparent blur-3xl"
            />
            <div className="relative aspect-square w-full max-w-md">
              <div className="absolute inset-6 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-gradient-to-br from-flame-300 via-flame-500 to-rust-700 shadow-flame animate-flicker" />
              <div className="absolute inset-12 rounded-[50%_50%_40%_60%/60%_40%_60%_40%] bg-gradient-to-br from-flame-200/40 to-rust-600/30 mix-blend-overlay" />
              <div className="absolute inset-0 flex items-center justify-center drop-shadow-2xl">
                {HAS_LOGO_FILE ? (
                  <Image
                    src={TENANT_CONFIG.logoUrl}
                    alt={TENANT_CONFIG.nome}
                    width={360}
                    height={360}
                    priority
                    className="h-[78%] w-[78%] rounded-full object-cover ring-4 ring-flame-500/40 shadow-flame"
                  />
                ) : (
                  <span className="text-[11rem] leading-none">
                    {hero.emojis[0]}
                  </span>
                )}
              </div>
              <div className="absolute -left-4 top-1/3 rotate-[-12deg] text-6xl drop-shadow-2xl">
                {hero.emojis[1]}
              </div>
              <div className="absolute -right-2 bottom-1/4 rotate-[15deg] text-5xl drop-shadow-2xl">
                {hero.emojis[2]}
              </div>
              <div className="absolute -bottom-4 left-1/4 text-5xl drop-shadow-2xl">
                {hero.emojis[3]}
              </div>
              <div className="absolute right-6 top-4 text-4xl drop-shadow-2xl">
                {hero.emojis[4]}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="glass rounded-3xl p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-flame-500/10 ring-1 ring-flame-500/30">
            <Flame className="h-6 w-6 text-flame-400 animate-flicker" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
            Confira nosso cardápio
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-onyx-200">
            Navegue pelo cardápio completo, veja fotos e preços de todos os
            nossos produtos. Atualizamos com frequência!{" "}
            <Link
              href="/cardapio"
              className="font-semibold text-flame-400 underline underline-offset-4"
            >
              Ver cardápio
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

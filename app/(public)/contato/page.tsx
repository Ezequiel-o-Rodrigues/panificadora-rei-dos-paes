import { InstagramIcon } from "@/components/shared/icons";

export const metadata = { title: "Contato" };

export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-ivory-50">
        Fale com a <span className="text-gradient-flame">gente</span>
      </h1>
      <p className="mt-6 text-lg text-onyx-200">
        Estamos no coração do bairro, prontos para te receber. Em breve um
        formulário e um mapa interativo aqui.
      </p>
      <a
        href="https://www.instagram.com/reidospaes_1/"
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-flame-400 via-flame-500 to-rust-600 px-6 py-3 text-sm font-bold text-onyx-950 shadow-flame transition hover:shadow-glow-lg"
      >
        <InstagramIcon className="h-4 w-4" />
        Seguir no Instagram
      </a>
    </div>
  );
}

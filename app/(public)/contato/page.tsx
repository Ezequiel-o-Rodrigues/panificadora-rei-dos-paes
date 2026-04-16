import { InstagramIcon } from "@/components/shared/icons";
import { TENANT_CONFIG } from "@/lib/config/tenant";

export const metadata = { title: "Contato" };

export default function ContatoPage() {
  const instagramHandle = TENANT_CONFIG.contato.instagram;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${instagramHandle.replace(/^@/, "")}/`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-ivory-50">
        Fale com a <span className="text-gradient-flame">gente</span>
      </h1>
      <p className="mt-6 text-lg text-onyx-200">
        Estamos prontos para te receber. Em breve um formulário e um mapa
        interativo aqui.
      </p>
      {TENANT_CONFIG.contato.telefone && (
        <p className="mt-4 text-lg text-onyx-200">
          Telefone:{" "}
          <strong className="text-flame-400">
            {TENANT_CONFIG.contato.telefone}
          </strong>
        </p>
      )}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-flame-400 via-flame-500 to-rust-600 px-6 py-3 text-sm font-bold text-onyx-950 shadow-flame transition hover:shadow-glow-lg"
        >
          <InstagramIcon className="h-4 w-4" />
          Seguir no Instagram
        </a>
      )}
    </div>
  );
}

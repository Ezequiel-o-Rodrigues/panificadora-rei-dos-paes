import { Clock, MapPin, Phone, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/shared/icons";
import { getTenantRuntime, splitHorario } from "@/lib/config/tenant-runtime";

export const metadata = { title: "Contato" };
export const dynamic = "force-dynamic";

function whatsappLink(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

export default async function ContatoPage() {
  const tenant = await getTenantRuntime();
  const { telefone, whatsapp, instagram, endereco } = tenant.contato;
  const horarios = splitHorario(tenant.horarioFuncionamento);

  const instagramUrl = instagram
    ? `https://www.instagram.com/${instagram.replace(/^@/, "")}/`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-onyx-900">
        Fale com a <span className="text-gradient-flame">gente</span>
      </h1>
      <p className="mt-6 text-lg text-onyx-600">
        Estamos prontos para te receber. Aqui estão nossos canais.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {endereco && (
          <ContactCard icon={<MapPin className="h-5 w-5" />} title="Endereço">
            <span className="text-onyx-700">{endereco}</span>
          </ContactCard>
        )}

        {telefone && (
          <ContactCard icon={<Phone className="h-5 w-5" />} title="Telefone">
            <a
              href={`tel:${telefone.replace(/\D/g, "")}`}
              className="font-semibold text-flame-600 hover:text-flame-700"
            >
              {telefone}
            </a>
          </ContactCard>
        )}

        {whatsapp && (
          <ContactCard
            icon={<MessageCircle className="h-5 w-5" />}
            title="WhatsApp"
          >
            <a
              href={whatsappLink(whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-flame-600 hover:text-flame-700"
            >
              {whatsapp}
            </a>
          </ContactCard>
        )}

        {horarios.length > 0 && (
          <ContactCard icon={<Clock className="h-5 w-5" />} title="Horário">
            <ul className="space-y-1 text-onyx-700">
              {horarios.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </ContactCard>
        )}
      </div>

      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-flame-400 via-flame-500 to-rust-500 px-6 py-3 text-sm font-bold text-white shadow-flame transition hover:shadow-glow-lg"
        >
          <InstagramIcon className="h-4 w-4" />
          Seguir no Instagram
        </a>
      )}
    </div>
  );
}

function ContactCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-flame-500/20 bg-white/80 p-5 shadow-soft">
      <div className="flex items-center gap-2 text-flame-600">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.18em]">
          {title}
        </span>
      </div>
      <div className="mt-2 text-base">{children}</div>
    </div>
  );
}

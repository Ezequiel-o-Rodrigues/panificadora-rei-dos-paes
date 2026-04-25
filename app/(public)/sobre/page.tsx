import { getTenantRuntime } from "@/lib/config/tenant-runtime";

export const metadata = { title: "Sobre" };
export const dynamic = "force-dynamic";

export default async function SobrePage() {
  const tenant = await getTenantRuntime();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-onyx-900">
        Nossa <span className="text-gradient-flame">história</span>
      </h1>
      <p className="mt-6 text-lg text-onyx-600">
        A {tenant.nome} nasceu do sonho de atender o bairro com qualidade
        e atenção aos detalhes. Em breve contaremos toda a história por aqui.
      </p>
    </div>
  );
}

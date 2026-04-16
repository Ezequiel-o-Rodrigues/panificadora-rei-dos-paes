import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { TENANT_CONFIG } from "@/lib/config/tenant";
import { isFeatureEnabled } from "@/lib/features";
import { requireUser } from "@/lib/session";
import { generateMesaQrCodesDataUrls } from "@/lib/modules/cardapio-qr/generate";
import { QrMesasPrintable } from "./_components/QrMesasPrintable";

export const metadata = {
  title: "QR Codes das Mesas | Admin",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ total?: string; inicio?: string }>;
}

export default async function QrMesasPage({ searchParams }: PageProps) {
  await requireUser();

  if (!isFeatureEnabled("cardapio_qr_mesa")) {
    notFound();
  }

  const params = await searchParams;
  const total = Math.min(Math.max(Number(params.total ?? "10") || 10, 1), 100);
  const inicio = Math.max(Number(params.inicio ?? "1") || 1, 1);

  const mesas = Array.from({ length: total }, (_, i) => inicio + i);
  const qrCodes = await generateMesaQrCodesDataUrls(mesas);

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Codes das Mesas"
        description={`Gere e imprima os QR Codes das mesas. Clientes escaneiam e abrem o cardápio já com a mesa selecionada.`}
      />

      <QrMesasPrintable
        qrCodes={qrCodes}
        nomeEstabelecimento={TENANT_CONFIG.nome}
        totalAtual={total}
        inicioAtual={inicio}
      />
    </div>
  );
}

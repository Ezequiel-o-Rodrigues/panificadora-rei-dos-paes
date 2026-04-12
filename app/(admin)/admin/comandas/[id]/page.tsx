import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getComandaDetalhada } from "../_queries";
import { ComandaDetail } from "../_components/ComandaDetail";

export default async function ComandaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id } = await params;
  const numericId = Number(id);

  if (Number.isNaN(numericId) || numericId <= 0) {
    redirect("/admin/comandas");
  }

  const comanda = await getComandaDetalhada(numericId);

  if (!comanda) {
    redirect("/admin/comandas");
  }

  return <ComandaDetail comanda={comanda} />;
}

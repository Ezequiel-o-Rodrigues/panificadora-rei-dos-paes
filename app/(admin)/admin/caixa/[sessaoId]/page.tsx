import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { PDVInterface } from "../_components/PDVInterface";
import {
  getCategoriasComProdutos,
  getComandasPorSessao,
  getConfigGorjeta,
  getGarconsAtivos,
  getProdutosParaPDV,
  getResumoSessao,
  getSessaoById,
} from "../_queries";

export default async function PDVPage({
  params,
}: {
  params: Promise<{ sessaoId: string }>;
}) {
  await requireUser();

  const { sessaoId: sessaoIdRaw } = await params;
  const sessaoId = Number(sessaoIdRaw);

  if (!Number.isFinite(sessaoId) || sessaoId <= 0) {
    redirect("/admin/caixa");
  }

  const sessao = await getSessaoById(sessaoId);
  if (!sessao) {
    redirect("/admin/caixa");
  }
  if (sessao.status !== "aberta") {
    redirect("/admin/caixa");
  }

  const [
    comandasAbertas,
    produtos,
    categorias,
    garcons,
    configGorjeta,
    resumo,
  ] = await Promise.all([
    getComandasPorSessao(sessaoId),
    getProdutosParaPDV(),
    getCategoriasComProdutos(),
    getGarconsAtivos(),
    getConfigGorjeta(),
    getResumoSessao(sessaoId),
  ]);

  return (
    <PDVInterface
      sessao={{
        id: sessao.id,
        valorAbertura: sessao.valorAbertura,
        status: sessao.status,
        dataAbertura: sessao.dataAbertura,
      }}
      comandasAbertas={comandasAbertas}
      produtos={produtos}
      categorias={categorias}
      garcons={garcons}
      configGorjeta={configGorjeta}
      resumo={resumo}
    />
  );
}

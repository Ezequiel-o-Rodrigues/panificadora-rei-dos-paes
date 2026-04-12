import Link from "next/link";
import { ArrowLeft, TrendingDown, DollarSign } from "lucide-react";
import {
  PageHeader,
  Button,
  StatCard,
} from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { getPerdas, getProdutosAtivosParaForm } from "../_queries";
import { LossesTable } from "./_components/LossesTable";

interface PerdasPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function PerdasPage({ searchParams }: PerdasPageProps) {
  const params = await searchParams;

  const [perdas, produtos] = await Promise.all([
    getPerdas({
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    getProdutosAtivosParaForm(),
  ]);

  const totalPerdas = perdas.length;
  const valorTotalPerdido = perdas.reduce(
    (acc, p) => acc + Number(p.valor),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Perdas"
        description="Acompanhe quebras, vencimentos e ajustes de inventário"
      >
        <Link href="/admin/estoque">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Total de perdas"
          value={totalPerdas}
          icon={TrendingDown}
          description="Registros no período"
        />
        <StatCard
          title="Valor total perdido"
          value={formatBRL(valorTotalPerdido)}
          icon={DollarSign}
          description="Somatório das perdas"
        />
      </div>

      <LossesTable
        perdas={perdas}
        produtos={produtos}
        initialStartDate={params.startDate ?? ""}
        initialEndDate={params.endDate ?? ""}
      />
    </div>
  );
}

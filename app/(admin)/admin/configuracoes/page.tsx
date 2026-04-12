import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/admin";
import { getConfigMap, getGarcons } from "./_queries";
import { ConfigTabs } from "./_components/ConfigTabs";

export default async function ConfiguracoesPage() {
  await requireAdmin();

  const [configs, garcons] = await Promise.all([getConfigMap(), getGarcons()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações gerais do sistema"
      />
      <ConfigTabs configs={configs} garcons={garcons} />
    </div>
  );
}

import { db } from "@/db";
import { configuracoesSistema, garcons } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getConfiguracoes() {
  return db.query.configuracoesSistema.findMany();
}

export async function getConfigValue(chave: string) {
  const config = await db.query.configuracoesSistema.findFirst({
    where: eq(configuracoesSistema.chave, chave),
  });
  return config?.valor ?? null;
}

export async function getConfigMap(): Promise<Record<string, string>> {
  const configs = await getConfiguracoes();
  const map: Record<string, string> = {};
  for (const config of configs) {
    map[config.chave] = config.valor ?? "";
  }
  return map;
}

export async function getGarcons() {
  return db.query.garcons.findMany({
    orderBy: [asc(garcons.nome)],
  });
}

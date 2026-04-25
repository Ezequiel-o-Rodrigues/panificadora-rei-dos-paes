import { db } from "@/db";
import { TENANT_CONFIG } from "./tenant";

/**
 * Configurações do tenant resolvidas em runtime.
 * Prioridade: valor salvo em `configuracoes_sistema` > variável de ambiente
 * (TENANT_CONFIG). Vazio/null cai pro fallback.
 *
 * Server-only: usa o cliente do Drizzle direto.
 */
export type TenantRuntime = {
  nome: string;
  contato: {
    telefone: string | null;
    whatsapp: string | null;
    instagram: string | null;
    endereco: string | null;
  };
  horarioFuncionamento: string | null;
};

function pick(dbValue: string | undefined, envFallback: string | undefined | null): string | null {
  const v = (dbValue ?? "").trim();
  if (v) return v;
  const e = (envFallback ?? "").trim();
  return e || null;
}

export async function getTenantRuntime(): Promise<TenantRuntime> {
  let map: Record<string, string> = {};
  try {
    const rows = await db.query.configuracoesSistema.findMany();
    for (const r of rows) {
      if (r.valor != null) map[r.chave] = r.valor;
    }
  } catch {
    map = {};
  }

  return {
    nome: pick(map["nome_empresa"], TENANT_CONFIG.nome) ?? TENANT_CONFIG.nome,
    contato: {
      telefone: pick(map["telefone"], TENANT_CONFIG.contato.telefone),
      whatsapp: pick(map["whatsapp"], TENANT_CONFIG.contato.whatsapp),
      instagram: pick(map["instagram"], TENANT_CONFIG.contato.instagram),
      endereco: pick(map["endereco"], null),
    },
    horarioFuncionamento: pick(map["horario_funcionamento"], null),
  };
}

/**
 * Quebra a string única "Seg-Sáb: 06h-20h | Dom: 06h-13h" em linhas
 * separadas pra renderizar em listas (footer/contato).
 */
export function splitHorario(horario: string | null): string[] {
  if (!horario) return [];
  return horario
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

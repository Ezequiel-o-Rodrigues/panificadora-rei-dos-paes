import type { DateRange, Granularity } from "./_queries";

/**
 * Helpers compartilhados entre as páginas do módulo de relatórios.
 */

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Retorna o intervalo padrão dos últimos 30 dias (inclusive hoje). */
export function defaultDateRange(days = 30): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    startDate: fmtDate(start),
    endDate: fmtDate(end),
  };
}

/** Valida e normaliza um intervalo vindo de searchParams. */
export function parseDateRange(
  params: { startDate?: string; endDate?: string },
  fallbackDays = 30,
): DateRange {
  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const fallback = defaultDateRange(fallbackDays);
  const startDate =
    params.startDate && isoRe.test(params.startDate)
      ? params.startDate
      : fallback.startDate;
  const endDate =
    params.endDate && isoRe.test(params.endDate)
      ? params.endDate
      : fallback.endDate;
  // Garante ordem cronológica
  if (startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }
  return { startDate, endDate };
}

/** Valida o parâmetro de granularidade. */
export function parseGranularity(value?: string): Granularity {
  if (value === "semana" || value === "mes") return value;
  return "dia";
}

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

export function labelFormaPagamento(key: string): string {
  return FORMA_PAGAMENTO_LABEL[key] ?? key;
}

/**
 * Formata uma quantidade (string ou number) com até 3 casas decimais,
 * removendo zeros à direita desnecessários.
 */
export function formatQty(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

/** Formata um rótulo de período conforme a granularidade escolhida. */
export function formatPeriodoLabel(
  isoPeriod: string,
  granularity: Granularity,
): string {
  if (!isoPeriod) return "";
  const d = new Date(isoPeriod);
  if (Number.isNaN(d.getTime())) return isoPeriod;
  if (granularity === "mes") {
    return d.toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  }
  if (granularity === "semana") {
    return `Sem. ${d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })}`;
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "R$ 0,00";
  return brlFormatter.format(n);
}

export function parseBRL(input: string): number {
  const cleaned = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

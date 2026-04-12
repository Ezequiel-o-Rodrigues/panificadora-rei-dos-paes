/**
 * Funções puras de cálculo de negócio.
 * Recebem string (numeric do Drizzle) e retornam string para gravar no banco.
 */

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isNaN(n) ? 0 : n;
}

function toMoney(n: number): string {
  return n.toFixed(2);
}

function toQty(n: number): string {
  return n.toFixed(3);
}

export function calcSubtotal(
  quantidade: string | number,
  precoUnitario: string | number
): string {
  return toMoney(toNum(quantidade) * toNum(precoUnitario));
}

export function calcGorjetaPercentual(
  subtotal: string | number,
  taxaPercent: string | number
): string {
  return toMoney(toNum(subtotal) * (toNum(taxaPercent) / 100));
}

export function calcGorjetaFixa(taxaFixa: string | number): string {
  return toMoney(toNum(taxaFixa));
}

export function calcTotalComanda(
  subtotalItens: string | number,
  gorjeta: string | number
): string {
  return toMoney(toNum(subtotalItens) + toNum(gorjeta));
}

export function calcEstoqueTeorico(
  estoqueInicial: string | number,
  entradas: string | number,
  saidas: string | number
): string {
  return toQty(toNum(estoqueInicial) + toNum(entradas) - toNum(saidas));
}

export function calcPerda(
  estoqueTeorico: string | number,
  estoqueReal: string | number
): string {
  const diff = toNum(estoqueTeorico) - toNum(estoqueReal);
  return toQty(Math.max(0, diff));
}

export function calcValorPerda(
  quantidadePerda: string | number,
  precoUnitario: string | number
): string {
  return toMoney(toNum(quantidadePerda) * toNum(precoUnitario));
}

export function calcComissaoGarcom(
  totalVendas: string | number,
  taxaComissao: string | number
): string {
  return toMoney(toNum(totalVendas) * toNum(taxaComissao));
}

export function calcTicketMedio(
  valorTotal: string | number,
  totalComandas: number
): string {
  if (totalComandas <= 0) return toMoney(0);
  return toMoney(toNum(valorTotal) / totalComandas);
}

export type ClassificacaoGarcom =
  | "Excelente"
  | "Bom"
  | "Regular"
  | "Abaixo da média";

export function calcDesempenhoGarcom(
  comandasGarcom: number,
  mediaGeral: number
): { ratio: number; classificacao: ClassificacaoGarcom } {
  if (mediaGeral <= 0) return { ratio: 0, classificacao: "Regular" };
  const ratio = comandasGarcom / mediaGeral;
  let classificacao: ClassificacaoGarcom;
  if (ratio >= 1.2) classificacao = "Excelente";
  else if (ratio >= 1.0) classificacao = "Bom";
  else if (ratio >= 0.8) classificacao = "Regular";
  else classificacao = "Abaixo da média";
  return { ratio, classificacao };
}

export function calcDiferencaCaixa(
  valorFechamento: string | number,
  valorEsperado: string | number
): string {
  return toMoney(toNum(valorFechamento) - toNum(valorEsperado));
}

export { toNum, toMoney, toQty };

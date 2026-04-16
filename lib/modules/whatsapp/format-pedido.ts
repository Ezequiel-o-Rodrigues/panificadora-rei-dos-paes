import { TENANT_CONFIG } from "@/lib/config/tenant";

export type PedidoItem = {
  nome: string;
  quantidade: number;
  precoUnitario: number;
};

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatPedidoWhatsApp(
  itens: PedidoItem[],
  opts?: { mesa?: number | null },
): string {
  const mesa = opts?.mesa;
  const mesaSuffix = mesa != null ? ` (Mesa ${mesa})` : "";

  if (itens.length === 0) {
    return `Olá! Gostaria de fazer um pedido na ${TENANT_CONFIG.nome}${mesaSuffix}.`;
  }

  const linhas: string[] = [];
  linhas.push(
    `Olá! Gostaria de fazer um pedido na ${TENANT_CONFIG.nome}${mesaSuffix}:`
  );
  linhas.push("");

  let total = 0;
  for (const item of itens) {
    const subtotal = item.quantidade * item.precoUnitario;
    total += subtotal;
    linhas.push(
      `• ${item.quantidade}x ${item.nome} — ${formatBRL(subtotal)}`
    );
  }

  linhas.push("");
  linhas.push(`*Total: ${formatBRL(total)}*`);

  return linhas.join("\n");
}

export function buildWhatsAppUrl(
  numero: string | undefined,
  mensagem: string
): string {
  const numeroLimpo = numero?.replace(/\D/g, "") ?? "";
  const texto = encodeURIComponent(mensagem);
  return numeroLimpo
    ? `https://wa.me/${numeroLimpo}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}

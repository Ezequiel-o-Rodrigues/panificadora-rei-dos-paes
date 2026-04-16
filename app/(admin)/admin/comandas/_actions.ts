"use server";

import { db } from "@/db";
import { comandas, comprovantesVenda } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { formatBRL } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { TENANT_CONFIG } from "@/lib/config/tenant";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  pix: "PIX",
  voucher: "Voucher",
  outro: "Outro",
};

export async function cancelarComanda(
  id: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, id),
    });

    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }

    if (comanda.status === "finalizada") {
      return {
        success: false,
        error: "Não é possível cancelar uma comanda já finalizada.",
      };
    }

    if (comanda.status === "cancelada") {
      return { success: false, error: "Esta comanda já está cancelada." };
    }

    await db
      .update(comandas)
      .set({
        status: "cancelada",
        dataFechamento: new Date(),
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(comandas.id, id));

    revalidatePath("/admin/comandas");
    revalidatePath(`/admin/comandas/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar comanda:", error);
    return { success: false, error: "Erro ao cancelar comanda." };
  }
}

function gerarConteudoComprovante(
  comanda: typeof comandas.$inferSelect & {
    garcom?: { nome: string } | null;
    itens: Array<{
      quantidade: string;
      precoUnitario: string;
      subtotal: string;
      produto: { nome: string };
    }>;
    itensLivres: Array<{
      descricao: string;
      quantidade: string;
      precoUnitario: string;
      subtotal: string;
    }>;
  },
): string {
  const linhas: string[] = [];
  const LARGURA = 40;
  const separador = "-".repeat(LARGURA);
  const centralizar = (txt: string) => {
    const padding = Math.max(0, Math.floor((LARGURA - txt.length) / 2));
    return " ".repeat(padding) + txt;
  };

  const nomeTenant = TENANT_CONFIG.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  linhas.push(centralizar(nomeTenant.substring(0, LARGURA)));
  linhas.push(centralizar("COMPROVANTE DE VENDA"));
  linhas.push(separador);
  linhas.push(`Comanda: #${String(comanda.numero).padStart(4, "0")}`);
  linhas.push(`Data: ${formatDateTime(comanda.dataAbertura)}`);
  if (comanda.garcom?.nome) {
    linhas.push(`Garçom: ${comanda.garcom.nome}`);
  }
  linhas.push(separador);
  linhas.push("ITENS");
  linhas.push(separador);

  for (const item of comanda.itens) {
    const qtd = Number(item.quantidade);
    const preco = Number(item.precoUnitario);
    const sub = Number(item.subtotal);
    linhas.push(item.produto.nome);
    linhas.push(
      `  ${qtd.toLocaleString("pt-BR")} x ${formatBRL(preco)}`.padEnd(LARGURA - 10) +
        formatBRL(sub).padStart(10),
    );
  }

  for (const item of comanda.itensLivres) {
    const qtd = Number(item.quantidade);
    const preco = Number(item.precoUnitario);
    const sub = Number(item.subtotal);
    linhas.push(item.descricao);
    linhas.push(
      `  ${qtd.toLocaleString("pt-BR")} x ${formatBRL(preco)}`.padEnd(LARGURA - 10) +
        formatBRL(sub).padStart(10),
    );
  }

  linhas.push(separador);

  const valorTotal = Number(comanda.valorTotal);
  const gorjeta = Number(comanda.taxaGorjeta);
  const subtotalCalc = valorTotal - gorjeta;

  linhas.push(`SUBTOTAL`.padEnd(LARGURA - 12) + formatBRL(subtotalCalc).padStart(12));
  if (gorjeta > 0) {
    linhas.push(`GORJETA`.padEnd(LARGURA - 12) + formatBRL(gorjeta).padStart(12));
  }
  linhas.push(`TOTAL`.padEnd(LARGURA - 12) + formatBRL(valorTotal).padStart(12));

  if (comanda.formaPagamento) {
    linhas.push(separador);
    linhas.push(
      `Pagamento: ${FORMA_PAGAMENTO_LABELS[comanda.formaPagamento] ?? comanda.formaPagamento}`,
    );
  }

  linhas.push(separador);
  linhas.push(centralizar("Obrigado pela preferência!"));
  linhas.push("");

  return linhas.join("\n");
}

export async function reimprimirComprovante(
  id: number,
): Promise<ActionResult<{ content: string }>> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, id),
      with: {
        garcom: true,
        itens: { with: { produto: true } },
        itensLivres: true,
        comprovantes: {
          orderBy: [desc(comprovantesVenda.createdAt)],
          limit: 1,
        },
      },
    });

    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }

    let conteudo: string;
    let comprovanteId: number;

    if (comanda.comprovantes.length > 0) {
      const comprovante = comanda.comprovantes[0];
      conteudo = comprovante.conteudo;
      comprovanteId = comprovante.id;
    } else {
      conteudo = gerarConteudoComprovante(comanda);
      const [novo] = await db
        .insert(comprovantesVenda)
        .values({
          comandaId: comanda.id,
          conteudo,
          tipo: "termico",
          impresso: false,
        })
        .returning();
      comprovanteId = novo.id;
    }

    await db
      .update(comprovantesVenda)
      .set({ impresso: true })
      .where(eq(comprovantesVenda.id, comprovanteId));

    revalidatePath(`/admin/comandas/${id}`);
    return { success: true, data: { content: conteudo } };
  } catch (error) {
    console.error("Erro ao reimprimir comprovante:", error);
    return { success: false, error: "Erro ao reimprimir comprovante." };
  }
}

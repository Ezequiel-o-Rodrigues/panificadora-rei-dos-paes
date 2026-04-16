"use server";

import { db } from "@/db";
import {
  caixaSessoes,
  comandas,
  itensComanda,
  itensLivres,
  pagamentosPix,
  produtos,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import {
  calcSubtotal,
  toMoney,
  toQty,
} from "@/lib/calculations";
import { finalizarComandaCore } from "@/lib/modules/comandas/finalizar-core";
import { criarPagamentoPixParaComanda } from "@/lib/modules/mercadopago/create-pix";
import { createMpClient } from "@/lib/modules/mercadopago/client";
import { getFeatureConfig } from "@/lib/features";
import {
  abrirCaixaSchema,
  fecharCaixaSchema,
} from "@/lib/validators/caixa";
import {
  adicionarItemLivreSchema,
  adicionarItemSchema,
  criarComandaSchema,
  finalizarComandaSchema,
} from "@/lib/validators/comanda";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getConfigGorjeta, getProximoNumeroComanda } from "./_queries";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Recalcula o valorTotal da comanda somando itens (produtos) e itens livres.
 * NOTA: isto é chamado dentro de "transações" simuladas (o driver neon-http
 * não suporta transações reais; preservamos invariantes na ordem das operações).
 */
async function recalcularTotalComanda(comandaId: number): Promise<number> {
  const [itens, livres] = await Promise.all([
    db.query.itensComanda.findMany({
      where: eq(itensComanda.comandaId, comandaId),
    }),
    db.query.itensLivres.findMany({
      where: eq(itensLivres.comandaId, comandaId),
    }),
  ]);

  const subtotal = [
    ...itens.map((i) => Number(i.subtotal)),
    ...livres.map((i) => Number(i.subtotal)),
  ].reduce((acc, n) => acc + n, 0);

  await db
    .update(comandas)
    .set({ valorTotal: toMoney(subtotal) })
    .where(eq(comandas.id, comandaId));

  return subtotal;
}

// ---------------------------------------------------------------------------
// Gestão de sessão
// ---------------------------------------------------------------------------

export async function abrirCaixa(
  formData: FormData,
): Promise<ActionResult<{ sessaoId: number }>> {
  try {
    const user = await requireUser();

    const raw = {
      valorAbertura: String(formData.get("valorAbertura") ?? "0"),
    };
    const parsed = abrirCaixaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    // Regra: apenas uma sessão aberta por vez
    const jaAberta = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.status, "aberta"),
    });
    if (jaAberta) {
      return {
        success: false,
        error:
          "Já existe uma sessão de caixa aberta. Feche-a antes de abrir outra.",
      };
    }

    const observacoes = String(formData.get("observacoes") ?? "").trim();

    const [nova] = await db
      .insert(caixaSessoes)
      .values({
        usuarioAberturaId: Number(user.id),
        valorAbertura: parsed.data.valorAbertura,
        status: "aberta",
        observacoes: observacoes || null,
      })
      .returning({ id: caixaSessoes.id });

    revalidatePath("/admin/caixa");
    return { success: true, data: { sessaoId: nova.id } };
  } catch (error) {
    console.error("Erro ao abrir caixa:", error);
    return { success: false, error: "Erro ao abrir caixa." };
  }
}

export async function fecharCaixa(
  sessaoId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const raw = {
      valorFechamento: String(formData.get("valorFechamento") ?? "0"),
      observacoes: (formData.get("observacoes") as string) || undefined,
    };
    const parsed = fecharCaixaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const sessao = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.id, sessaoId),
    });
    if (!sessao) {
      return { success: false, error: "Sessão não encontrada." };
    }
    if (sessao.status !== "aberta") {
      return { success: false, error: "Esta sessão já está fechada." };
    }

    // Regra: não pode fechar com comandas em aberto
    const abertas = await db.query.comandas.findMany({
      where: and(
        eq(comandas.caixaSessaoId, sessaoId),
        eq(comandas.status, "aberta"),
      ),
      columns: { id: true },
    });
    if (abertas.length > 0) {
      return {
        success: false,
        error: `Existem ${abertas.length} comanda(s) em aberto. Finalize ou cancele antes de fechar o caixa.`,
      };
    }

    const observacoesFinal = parsed.data.observacoes?.trim()
      ? parsed.data.observacoes.trim()
      : sessao.observacoes;

    await db
      .update(caixaSessoes)
      .set({
        status: "fechada",
        valorFechamento: parsed.data.valorFechamento,
        observacoes: observacoesFinal,
        dataFechamento: new Date(),
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(caixaSessoes.id, sessaoId));

    revalidatePath("/admin/caixa");
    revalidatePath(`/admin/caixa/${sessaoId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao fechar caixa:", error);
    return { success: false, error: "Erro ao fechar caixa." };
  }
}

// ---------------------------------------------------------------------------
// Gestão de comandas
// ---------------------------------------------------------------------------

export async function criarComanda(
  sessaoId: number,
  formData: FormData,
): Promise<ActionResult<{ comandaId: number }>> {
  try {
    const user = await requireUser();

    const raw = {
      garcomId: formData.get("garcomId") || undefined,
      observacoes: (formData.get("observacoes") as string) || undefined,
    };
    const parsed = criarComandaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const sessao = await db.query.caixaSessoes.findFirst({
      where: eq(caixaSessoes.id, sessaoId),
    });
    if (!sessao) {
      return { success: false, error: "Sessão não encontrada." };
    }
    if (sessao.status !== "aberta") {
      return { success: false, error: "Sessão de caixa não está aberta." };
    }

    const numero = await getProximoNumeroComanda();

    const [nova] = await db
      .insert(comandas)
      .values({
        numero,
        status: "aberta",
        valorTotal: "0",
        taxaGorjeta: "0",
        garcomId: parsed.data.garcomId ?? null,
        caixaSessaoId: sessaoId,
        usuarioAberturaId: Number(user.id),
        observacoes: parsed.data.observacoes?.trim() || null,
      })
      .returning({ id: comandas.id });

    revalidatePath(`/admin/caixa/${sessaoId}`);
    return { success: true, data: { comandaId: nova.id } };
  } catch (error) {
    console.error("Erro ao criar comanda:", error);
    return { success: false, error: "Erro ao criar comanda." };
  }
}

/**
 * Permite trocar/definir o garçom de uma comanda aberta. Não estava no plano
 * original mas é necessário para alinhar com o comportamento do PDV.
 */
export async function atualizarGarcomComanda(
  comandaId: number,
  garcomId: number | null,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    await db
      .update(comandas)
      .set({ garcomId })
      .where(eq(comandas.id, comandaId));

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar garçom:", error);
    return { success: false, error: "Erro ao atualizar garçom." };
  }
}

export async function adicionarItem(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const raw = {
      produtoId: formData.get("produtoId"),
      quantidade: formData.get("quantidade"),
    };
    const parsed = adicionarItemSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, parsed.data.produtoId),
    });
    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }
    if (!produto.ativo || !produto.disponivelHoje) {
      return { success: false, error: "Produto indisponível no momento." };
    }

    const qtd = parsed.data.quantidade;
    const subtotal = calcSubtotal(qtd, produto.preco);

    await db.insert(itensComanda).values({
      comandaId,
      produtoId: produto.id,
      quantidade: toQty(qtd),
      precoUnitario: produto.preco,
      subtotal,
    });

    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    return { success: false, error: "Erro ao adicionar item." };
  }
}

export async function adicionarItemLivre(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const raw = {
      descricao: formData.get("descricao"),
      quantidade: formData.get("quantidade"),
      precoUnitario: String(formData.get("precoUnitario") ?? "0"),
    };
    const parsed = adicionarItemLivreSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const qtd = parsed.data.quantidade;
    const subtotal = calcSubtotal(qtd, parsed.data.precoUnitario);

    await db.insert(itensLivres).values({
      comandaId,
      descricao: parsed.data.descricao.trim(),
      quantidade: toQty(qtd),
      precoUnitario: parsed.data.precoUnitario,
      subtotal,
    });

    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao adicionar item livre:", error);
    return { success: false, error: "Erro ao adicionar item livre." };
  }
}

export async function removerItemComanda(
  itemId: number,
  comandaId: number,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const item = await db.query.itensComanda.findFirst({
      where: and(
        eq(itensComanda.id, itemId),
        eq(itensComanda.comandaId, comandaId),
      ),
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }

    await db.delete(itensComanda).where(eq(itensComanda.id, itemId));
    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover item:", error);
    return { success: false, error: "Erro ao remover item." };
  }
}

export async function removerItemLivre(
  itemId: number,
  comandaId: number,
): Promise<ActionResult> {
  try {
    await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    const item = await db.query.itensLivres.findFirst({
      where: and(
        eq(itensLivres.id, itemId),
        eq(itensLivres.comandaId, comandaId),
      ),
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }

    await db.delete(itensLivres).where(eq(itensLivres.id, itemId));
    await recalcularTotalComanda(comandaId);

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover item livre:", error);
    return { success: false, error: "Erro ao remover item livre." };
  }
}

// ---------------------------------------------------------------------------
// Finalizar comanda (delegada ao core reutilizável)
// ---------------------------------------------------------------------------

export async function finalizarComanda(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult<{ conteudo: string }>> {
  try {
    const user = await requireUser();

    const raw = {
      formaPagamento: formData.get("formaPagamento"),
      taxaGorjeta: String(formData.get("taxaGorjeta") ?? "0"),
    };
    const parsed = finalizarComandaSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos",
      };
    }

    const cfg = await getConfigGorjeta();
    const result = await finalizarComandaCore({
      comandaId,
      userId: Number(user.id),
      formaPagamento: parsed.data.formaPagamento,
      taxaGorjetaInput: parsed.data.taxaGorjeta,
      gorjetaConfig: cfg,
    });

    if (!result.success) return result;

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
      columns: { caixaSessaoId: true },
    });
    if (comanda?.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    revalidatePath("/admin/caixa");
    revalidatePath("/admin/comandas");
    revalidatePath("/admin/estoque");
    return result;
  } catch (error) {
    console.error("Erro ao finalizar comanda:", error);
    return { success: false, error: "Erro ao finalizar comanda." };
  }
}

// ---------------------------------------------------------------------------
// Mercado Pago Pix (módulo opcional)
// ---------------------------------------------------------------------------

export async function iniciarPagamentoPix(
  comandaId: number,
  formData: FormData,
): Promise<
  ActionResult<{
    pagamentoId: number;
    mpPaymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    valor: number;
    expiresAt: string;
  }>
> {
  try {
    await requireUser();

    const taxaGorjetaInput = Number(formData.get("taxaGorjeta") ?? "0") || 0;
    const cfgGorjeta = await getConfigGorjeta();

    let gorjetaEfetiva = taxaGorjetaInput;
    if (cfgGorjeta.tipo === "fixa") {
      gorjetaEfetiva = Number(cfgGorjeta.taxa);
    }

    const result = await criarPagamentoPixParaComanda(comandaId, gorjetaEfetiva);
    if (!result.success) return result;

    return {
      success: true,
      data: {
        pagamentoId: result.data.pagamentoId,
        mpPaymentId: result.data.mpPaymentId,
        qrCode: result.data.qrCode,
        qrCodeBase64: result.data.qrCodeBase64,
        valor: result.data.valor,
        expiresAt: result.data.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Erro ao iniciar pagamento Pix:", error);
    return { success: false, error: "Erro ao iniciar pagamento Pix." };
  }
}

export async function verificarPagamentoPix(
  pagamentoId: number,
): Promise<
  ActionResult<{
    status: string;
    conteudo?: string;
  }>
> {
  try {
    const user = await requireUser();

    const pagamento = await db.query.pagamentosPix.findFirst({
      where: eq(pagamentosPix.id, pagamentoId),
    });
    if (!pagamento) {
      return { success: false, error: "Pagamento não encontrado." };
    }

    let statusAtual = pagamento.status;

    // Se ainda está pending, consulta a API do Mercado Pago
    if (statusAtual === "pending") {
      const cfg = getFeatureConfig("mercadopago_pix");
      if (cfg?.accessToken) {
        try {
          const mp = createMpClient(cfg.accessToken);
          const mpStatus = await mp.getPayment(pagamento.mpPaymentId);
          if (mpStatus.status === "approved") {
            statusAtual = "approved";
            await db
              .update(pagamentosPix)
              .set({ status: "approved", paidAt: new Date() })
              .where(eq(pagamentosPix.id, pagamentoId));
          } else if (
            mpStatus.status === "cancelled" ||
            mpStatus.status === "rejected"
          ) {
            statusAtual = mpStatus.status;
            await db
              .update(pagamentosPix)
              .set({ status: mpStatus.status })
              .where(eq(pagamentosPix.id, pagamentoId));
          }
        } catch (err) {
          console.error("[MP Pix] erro ao consultar status:", err);
        }
      }
    }

    // Se aprovado e a comanda ainda está aberta, finaliza
    if (statusAtual === "approved") {
      const comanda = await db.query.comandas.findFirst({
        where: eq(comandas.id, pagamento.comandaId),
        columns: { status: true, caixaSessaoId: true, usuarioAberturaId: true },
      });

      if (comanda?.status === "aberta") {
        const finalizado = await finalizarComandaCore({
          comandaId: pagamento.comandaId,
          userId: Number(user.id),
          formaPagamento: "pix",
          taxaGorjetaInput: pagamento.taxaGorjetaSnapshot,
          gorjetaConfig: {
            tipo: "fixa",
            taxa: pagamento.taxaGorjetaSnapshot,
          },
        });

        if (!finalizado.success) return finalizado;

        if (comanda.caixaSessaoId) {
          revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
        }
        revalidatePath("/admin/caixa");
        revalidatePath("/admin/comandas");
        revalidatePath("/admin/estoque");

        return {
          success: true,
          data: { status: statusAtual, conteudo: finalizado.data.conteudo },
        };
      }
    }

    return { success: true, data: { status: statusAtual } };
  } catch (error) {
    console.error("Erro ao verificar pagamento Pix:", error);
    return { success: false, error: "Erro ao verificar pagamento Pix." };
  }
}

export async function cancelarComanda(
  comandaId: number,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, comandaId),
    });
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada." };
    }
    if (comanda.status !== "aberta") {
      return { success: false, error: "Comanda não está aberta." };
    }

    // Cancelamento não mexe em estoque — itens nunca foram baixados
    await db
      .update(comandas)
      .set({
        status: "cancelada",
        dataFechamento: new Date(),
        usuarioFechamentoId: Number(user.id),
      })
      .where(eq(comandas.id, comandaId));

    if (comanda.caixaSessaoId) {
      revalidatePath(`/admin/caixa/${comanda.caixaSessaoId}`);
    }
    revalidatePath("/admin/caixa");
    revalidatePath("/admin/comandas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao cancelar comanda:", error);
    return { success: false, error: "Erro ao cancelar comanda." };
  }
}

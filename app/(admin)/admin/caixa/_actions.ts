"use server";

import { db } from "@/db";
import {
  caixaSessoes,
  comandas,
  itensComanda,
  itensLivres,
  pagamentosPix,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { calcSubtotal, toQty } from "@/lib/calculations";
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
import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  type ComandaPDV,
  getConfigGorjeta,
  getProximoNumeroComanda,
} from "./_queries";

// Carrega a comanda completa (com garcom, itens+produto, itensLivres) pra
// devolver pro cliente após cada mutação. Substitui o `router.refresh()`
// no PDVInterface — o cliente faz merge desse retorno no state local.
async function loadComandaPDV(comandaId: number): Promise<ComandaPDV | null> {
  const c = await db.query.comandas.findFirst({
    where: eq(comandas.id, comandaId),
    with: {
      garcom: true,
      itens: {
        with: { produto: true },
        orderBy: [asc(itensComanda.createdAt)],
      },
      itensLivres: {
        orderBy: [asc(itensLivres.createdAt)],
      },
    },
  });
  return (c as ComandaPDV | undefined) ?? null;
}

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
): Promise<ActionResult<{ comanda: ComandaPDV }>> {
  try {
    await requireUser();

    // UPDATE com filtro de status='aberta' embutido — se a comanda não estiver
    // aberta ou não existir, returning vem vazio e tratamos como erro.
    const updated = await db
      .update(comandas)
      .set({ garcomId })
      .where(and(eq(comandas.id, comandaId), eq(comandas.status, "aberta")))
      .returning({
        id: comandas.id,
        caixaSessaoId: comandas.caixaSessaoId,
      });

    if (updated.length === 0) {
      return { success: false, error: "Comanda não encontrada ou já fechada." };
    }

    const comanda = await loadComandaPDV(comandaId);
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada após atualização." };
    }

    // revalidatePath omitido de propósito — o cliente faz merge do retorno
    // no state local (Tier 2 Tarefa 4). Se outra aba/dispositivo estiver
    // com a mesma sessão aberta, ela só pega o update ao recarregar.
    return { success: true, data: { comanda } };
  } catch (error) {
    console.error("Erro ao atualizar garçom:", error);
    return { success: false, error: "Erro ao atualizar garçom." };
  }
}

export async function adicionarItem(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult<{ comanda: ComandaPDV }>> {
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

    const { produtoId } = parsed.data;
    const qtd = toQty(parsed.data.quantidade);

    // Multi-CTE: valida (comanda aberta + produto ativo/disponível) e faz
    // upsert + recalc do valor_total em uma única roundtrip ao Postgres.
    // ON CONFLICT na UNIQUE (comanda_id, produto_id) consolida em 1 linha;
    // quando há conflito, somamos quantidade e recomputamos subtotal com
    // o preco_unitario JÁ persistido (preserva preço histórico do item).
    const result = await db.execute(sql`
      WITH valido AS (
        SELECT c.id AS comanda_id, c.caixa_sessao_id AS sessao_id,
               p.id AS produto_id, p.preco
        FROM comandas c
        JOIN produtos p ON p.id = ${produtoId}
        WHERE c.id = ${comandaId}
          AND c.status = 'aberta'
          AND p.ativo = true
          AND p.disponivel_hoje = true
      ),
      upsert AS (
        INSERT INTO itens_comanda (comanda_id, produto_id, quantidade, preco_unitario, subtotal)
        SELECT comanda_id, produto_id, ${qtd}::numeric, preco, preco * ${qtd}::numeric
        FROM valido
        ON CONFLICT (comanda_id, produto_id) DO UPDATE
          SET quantidade = itens_comanda.quantidade + EXCLUDED.quantidade,
              subtotal   = (itens_comanda.quantidade + EXCLUDED.quantidade)
                           * itens_comanda.preco_unitario
        RETURNING comanda_id
      )
      UPDATE comandas
      SET valor_total = (
        COALESCE((SELECT SUM(subtotal) FROM itens_comanda WHERE comanda_id = comandas.id), 0) +
        COALESCE((SELECT SUM(subtotal) FROM itens_livres   WHERE comanda_id = comandas.id), 0)
      )
      FROM upsert
      WHERE comandas.id = upsert.comanda_id
      RETURNING comandas.id, comandas.caixa_sessao_id
    `);

    const rows = (result as unknown as { rows: Array<{ caixa_sessao_id: number | null }> }).rows;
    if (!rows || rows.length === 0) {
      return {
        success: false,
        error: "Comanda fechada ou produto indisponível.",
      };
    }

    const comanda = await loadComandaPDV(comandaId);
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada após atualização." };
    }

    return { success: true, data: { comanda } };
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    return { success: false, error: "Erro ao adicionar item." };
  }
}

export async function adicionarItemLivre(
  comandaId: number,
  formData: FormData,
): Promise<ActionResult<{ comanda: ComandaPDV }>> {
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

    const descricao = parsed.data.descricao.trim();
    const qtd = toQty(parsed.data.quantidade);
    const subtotal = calcSubtotal(parsed.data.quantidade, parsed.data.precoUnitario);

    // CTE: valida comanda aberta + insere + recalc do valor_total numa só
    // roundtrip. Se a comanda não estiver aberta, o INSERT vira no-op.
    const result = await db.execute(sql`
      WITH valido AS (
        SELECT id, caixa_sessao_id
        FROM comandas
        WHERE id = ${comandaId} AND status = 'aberta'
      ),
      ins AS (
        INSERT INTO itens_livres (comanda_id, descricao, quantidade, preco_unitario, subtotal)
        SELECT id, ${descricao}, ${qtd}::numeric,
               ${parsed.data.precoUnitario}::numeric, ${subtotal}::numeric
        FROM valido
        RETURNING comanda_id
      )
      UPDATE comandas
      SET valor_total = (
        COALESCE((SELECT SUM(subtotal) FROM itens_comanda WHERE comanda_id = comandas.id), 0) +
        COALESCE((SELECT SUM(subtotal) FROM itens_livres   WHERE comanda_id = comandas.id), 0)
      )
      FROM ins
      WHERE comandas.id = ins.comanda_id
      RETURNING comandas.id, comandas.caixa_sessao_id
    `);

    const rows = (result as unknown as { rows: Array<{ caixa_sessao_id: number | null }> }).rows;
    if (!rows || rows.length === 0) {
      return { success: false, error: "Comanda não está aberta." };
    }

    const comanda = await loadComandaPDV(comandaId);
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada após atualização." };
    }

    return { success: true, data: { comanda } };
  } catch (error) {
    console.error("Erro ao adicionar item livre:", error);
    return { success: false, error: "Erro ao adicionar item livre." };
  }
}

export async function removerItemComanda(
  itemId: number,
  comandaId: number,
): Promise<ActionResult<{ comanda: ComandaPDV }>> {
  try {
    await requireUser();

    // CTE: delete só se comanda aberta + item pertence à comanda. Recalcula
    // valor_total numa só roundtrip. Se delete encontrou 0 linhas, retorna
    // erro genérico.
    const result = await db.execute(sql`
      WITH del AS (
        DELETE FROM itens_comanda ic
        USING comandas c
        WHERE ic.id = ${itemId}
          AND ic.comanda_id = ${comandaId}
          AND c.id = ic.comanda_id
          AND c.status = 'aberta'
        RETURNING ic.comanda_id
      )
      UPDATE comandas
      SET valor_total = (
        COALESCE((SELECT SUM(subtotal) FROM itens_comanda WHERE comanda_id = comandas.id), 0) +
        COALESCE((SELECT SUM(subtotal) FROM itens_livres   WHERE comanda_id = comandas.id), 0)
      )
      FROM del
      WHERE comandas.id = del.comanda_id
      RETURNING comandas.id, comandas.caixa_sessao_id
    `);

    const rows = (result as unknown as { rows: Array<{ caixa_sessao_id: number | null }> }).rows;
    if (!rows || rows.length === 0) {
      return { success: false, error: "Item não encontrado ou comanda fechada." };
    }

    const comanda = await loadComandaPDV(comandaId);
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada após atualização." };
    }

    return { success: true, data: { comanda } };
  } catch (error) {
    console.error("Erro ao remover item:", error);
    return { success: false, error: "Erro ao remover item." };
  }
}

export async function removerItemLivre(
  itemId: number,
  comandaId: number,
): Promise<ActionResult<{ comanda: ComandaPDV }>> {
  try {
    await requireUser();

    const result = await db.execute(sql`
      WITH del AS (
        DELETE FROM itens_livres il
        USING comandas c
        WHERE il.id = ${itemId}
          AND il.comanda_id = ${comandaId}
          AND c.id = il.comanda_id
          AND c.status = 'aberta'
        RETURNING il.comanda_id
      )
      UPDATE comandas
      SET valor_total = (
        COALESCE((SELECT SUM(subtotal) FROM itens_comanda WHERE comanda_id = comandas.id), 0) +
        COALESCE((SELECT SUM(subtotal) FROM itens_livres   WHERE comanda_id = comandas.id), 0)
      )
      FROM del
      WHERE comandas.id = del.comanda_id
      RETURNING comandas.id, comandas.caixa_sessao_id
    `);

    const rows = (result as unknown as { rows: Array<{ caixa_sessao_id: number | null }> }).rows;
    if (!rows || rows.length === 0) {
      return { success: false, error: "Item não encontrado ou comanda fechada." };
    }

    const comanda = await loadComandaPDV(comandaId);
    if (!comanda) {
      return { success: false, error: "Comanda não encontrada após atualização." };
    }

    return { success: true, data: { comanda } };
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

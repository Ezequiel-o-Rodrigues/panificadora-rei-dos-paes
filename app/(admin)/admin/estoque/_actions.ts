"use server";

import { db } from "@/db";
import { produtos, movimentacoesEstoque, perdasEstoque } from "@/db/schema";
import { requireUser } from "@/lib/session";
import {
  entradaEstoqueSchema,
  perdaEstoqueSchema,
} from "@/lib/validators/estoque";
import { calcValorPerda } from "@/lib/calculations";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> = {
  success: boolean;
  error?: string;
  data?: T;
};

function toQty(n: number): string {
  return n.toFixed(3);
}

function revalidateEstoque() {
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/estoque/entrada");
  revalidatePath("/admin/estoque/inventario");
  revalidatePath("/admin/estoque/perdas");
  revalidatePath("/admin/produtos");
}

/**
 * Registra uma entrada de estoque (compras, reposição, etc).
 * Atualiza estoqueAtual do produto e cria uma movimentação do tipo "entrada".
 */
export async function registrarEntrada(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const raw = {
      produtoId: formData.get("produtoId"),
      quantidade: formData.get("quantidade"),
      observacao: (formData.get("observacao") as string) || undefined,
    };

    const parsed = entradaEstoqueSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        success: false,
        error: firstError?.message ?? "Dados inválidos",
      };
    }

    const { produtoId, quantidade, observacao } = parsed.data;

    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, produtoId),
    });

    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }

    if (!produto.ativo) {
      return {
        success: false,
        error: "Não é possível lançar entrada para produto inativo.",
      };
    }

    const quantidadeAnterior = Number(produto.estoqueAtual);
    const quantidadePosterior = quantidadeAnterior + quantidade;

    // Sequencial (neon-http não suporta transações):
    // 1. Inserir movimentação
    await db.insert(movimentacoesEstoque).values({
      produtoId: produto.id,
      tipo: "entrada",
      quantidade: toQty(quantidade),
      quantidadeAnterior: toQty(quantidadeAnterior),
      quantidadePosterior: toQty(quantidadePosterior),
      observacao: observacao?.trim() || null,
      usuarioId: Number(user.id),
    });

    // 2. Atualizar estoque do produto
    await db
      .update(produtos)
      .set({
        estoqueAtual: toQty(quantidadePosterior),
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, produto.id));

    revalidateEstoque();
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar entrada de estoque:", error);
    return { success: false, error: "Erro ao registrar entrada de estoque." };
  }
}

interface InventarioItemInput {
  produtoId: number;
  quantidadeContada: number;
}

/**
 * Registra um inventário físico: recebe a lista de produtos com a quantidade
 * contada e ajusta o estoque para bater com a realidade. Diferenças negativas
 * viram perdas automaticamente.
 */
export async function registrarInventario(
  formData: FormData,
): Promise<ActionResult<{ totalItens: number; totalPerdas: number }>> {
  try {
    const user = await requireUser();

    // Parse dos itens a partir do FormData.
    // Estrutura esperada: "itens[<idx>][produtoId]" / "itens[<idx>][quantidadeContada]"
    const itensMap = new Map<string, Partial<InventarioItemInput>>();

    for (const [key, value] of formData.entries()) {
      const match = key.match(/^itens\[(\d+)\]\[(produtoId|quantidadeContada)\]$/);
      if (!match) continue;
      const [, idx, field] = match;
      const current = itensMap.get(idx) ?? {};
      const num = Number(value);
      if (Number.isNaN(num)) continue;
      if (field === "produtoId") {
        current.produtoId = num;
      } else if (field === "quantidadeContada") {
        current.quantidadeContada = num;
      }
      itensMap.set(idx, current);
    }

    const itens: InventarioItemInput[] = [];
    for (const entry of itensMap.values()) {
      if (
        entry.produtoId != null &&
        entry.produtoId > 0 &&
        entry.quantidadeContada != null &&
        entry.quantidadeContada >= 0
      ) {
        itens.push({
          produtoId: entry.produtoId,
          quantidadeContada: entry.quantidadeContada,
        });
      }
    }

    if (itens.length === 0) {
      return {
        success: false,
        error: "Nenhum item válido informado para o inventário.",
      };
    }

    // Pré-busca dos produtos envolvidos (pré-validação sem transações)
    const produtoIds = Array.from(new Set(itens.map((i) => i.produtoId)));
    const produtosEncontrados = await db.query.produtos.findMany({
      where: (p, { inArray }) => inArray(p.id, produtoIds),
    });
    const produtoMap = new Map(produtosEncontrados.map((p) => [p.id, p]));

    // Valida que todos os produtos existem
    for (const item of itens) {
      if (!produtoMap.has(item.produtoId)) {
        return {
          success: false,
          error: `Produto #${item.produtoId} não encontrado.`,
        };
      }
    }

    let totalPerdas = 0;
    let totalItensAjustados = 0;

    // Processa cada item sequencialmente
    for (const item of itens) {
      const produto = produtoMap.get(item.produtoId)!;
      const estoqueTeorico = Number(produto.estoqueAtual);
      const quantidadeContada = item.quantidadeContada;
      const diferenca = quantidadeContada - estoqueTeorico;

      // Se não há diferença, pula
      if (diferenca === 0) continue;
      totalItensAjustados += 1;

      // 1. Movimentação de ajuste
      await db.insert(movimentacoesEstoque).values({
        produtoId: produto.id,
        tipo: "ajuste",
        quantidade: toQty(diferenca),
        quantidadeAnterior: toQty(estoqueTeorico),
        quantidadePosterior: toQty(quantidadeContada),
        observacao: `Inventário físico (diferença ${diferenca >= 0 ? "+" : ""}${toQty(diferenca)})`,
        usuarioId: Number(user.id),
      });

      // 2. Se a diferença for negativa, registra uma perda
      if (diferenca < 0) {
        const qtdPerda = Math.abs(diferenca);
        const valorPerda = calcValorPerda(qtdPerda, produto.preco);

        await db.insert(perdasEstoque).values({
          produtoId: produto.id,
          quantidade: toQty(qtdPerda),
          valor: valorPerda,
          motivo: "Inventário físico - ajuste",
          usuarioId: Number(user.id),
        });

        totalPerdas += 1;
      }

      // 3. Atualiza estoque do produto para o valor contado
      await db
        .update(produtos)
        .set({
          estoqueAtual: toQty(Math.max(0, quantidadeContada)),
          updatedAt: new Date(),
        })
        .where(eq(produtos.id, produto.id));
    }

    revalidateEstoque();
    return {
      success: true,
      data: { totalItens: totalItensAjustados, totalPerdas },
    };
  } catch (error) {
    console.error("Erro ao registrar inventário:", error);
    return { success: false, error: "Erro ao registrar inventário." };
  }
}

/**
 * Registra uma perda manual (quebra, vencimento, etc).
 * Reduz o estoque (sem nunca ficar abaixo de 0) e cria a movimentação de ajuste.
 */
export async function registrarPerda(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const raw = {
      produtoId: formData.get("produtoId"),
      quantidade: formData.get("quantidade"),
      motivo: formData.get("motivo"),
    };

    const parsed = perdaEstoqueSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        success: false,
        error: firstError?.message ?? "Dados inválidos",
      };
    }

    const { produtoId, quantidade, motivo } = parsed.data;

    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, produtoId),
    });

    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }

    const estoqueAtual = Number(produto.estoqueAtual);
    const estoquePosterior = Math.max(0, estoqueAtual - quantidade);
    const quantidadeRealBaixada = estoqueAtual - estoquePosterior;
    const valorPerda = calcValorPerda(quantidade, produto.preco);

    // 1. Insere a perda (registra sempre a quantidade informada pelo usuário)
    await db.insert(perdasEstoque).values({
      produtoId: produto.id,
      quantidade: toQty(quantidade),
      valor: valorPerda,
      motivo: motivo.trim(),
      usuarioId: Number(user.id),
    });

    // 2. Movimentação de ajuste (negativa, mas só até zerar o estoque)
    await db.insert(movimentacoesEstoque).values({
      produtoId: produto.id,
      tipo: "ajuste",
      quantidade: toQty(-quantidadeRealBaixada),
      quantidadeAnterior: toQty(estoqueAtual),
      quantidadePosterior: toQty(estoquePosterior),
      observacao: `Perda: ${motivo.trim()}`,
      usuarioId: Number(user.id),
    });

    // 3. Atualiza estoque (clampado em 0)
    await db
      .update(produtos)
      .set({
        estoqueAtual: toQty(estoquePosterior),
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, produto.id));

    revalidateEstoque();
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar perda:", error);
    return { success: false, error: "Erro ao registrar perda." };
  }
}

export async function marcarPerdaVisualizada(
  id: number,
): Promise<ActionResult> {
  try {
    await requireUser();

    const perda = await db.query.perdasEstoque.findFirst({
      where: eq(perdasEstoque.id, id),
    });

    if (!perda) {
      return { success: false, error: "Perda não encontrada." };
    }

    await db
      .update(perdasEstoque)
      .set({ visualizada: true })
      .where(eq(perdasEstoque.id, id));

    revalidateEstoque();
    return { success: true };
  } catch (error) {
    console.error("Erro ao marcar perda como visualizada:", error);
    return { success: false, error: "Erro ao atualizar perda." };
  }
}

"use server";

import { db } from "@/db";
import { produtos } from "@/db/schema";
import { produtoSchema } from "@/lib/validators/produto";
import { slugify } from "@/lib/slugify";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export async function createProduto(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      categoriaId: formData.get("categoriaId"),
      descricao: formData.get("descricao") || undefined,
      preco: formData.get("preco"),
      estoqueMinimo: formData.get("estoqueMinimo") || "0",
      unidadeMedida: formData.get("unidadeMedida"),
      pesoGramas: formData.get("pesoGramas") || undefined,
      disponivelHoje: formData.get("disponivelHoje") === "true",
      destaque: formData.get("destaque") === "true",
      ativo: formData.get("ativo") === "true",
    };

    const parsed = produtoSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const data = parsed.data;
    const slug = slugify(data.nome);

    await db.insert(produtos).values({
      nome: data.nome,
      slug,
      categoriaId: data.categoriaId,
      descricao: data.descricao || null,
      preco: data.preco,
      estoqueMinimo: data.estoqueMinimo ?? "0",
      unidadeMedida: data.unidadeMedida,
      pesoGramas: data.pesoGramas ?? null,
      disponivelHoje: data.disponivelHoje,
      destaque: data.destaque,
      ativo: data.ativo,
    });

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("produtos_slug_idx")
    ) {
      return {
        success: false,
        error: "Já existe um produto com esse nome.",
      };
    }
    console.error("Erro ao criar produto:", error);
    return { success: false, error: "Erro ao criar produto." };
  }
}

export async function updateProduto(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      categoriaId: formData.get("categoriaId"),
      descricao: formData.get("descricao") || undefined,
      preco: formData.get("preco"),
      estoqueMinimo: formData.get("estoqueMinimo") || "0",
      unidadeMedida: formData.get("unidadeMedida"),
      pesoGramas: formData.get("pesoGramas") || undefined,
      disponivelHoje: formData.get("disponivelHoje") === "true",
      destaque: formData.get("destaque") === "true",
      ativo: formData.get("ativo") === "true",
    };

    const parsed = produtoSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const data = parsed.data;
    const slug = slugify(data.nome);

    await db
      .update(produtos)
      .set({
        nome: data.nome,
        slug,
        categoriaId: data.categoriaId,
        descricao: data.descricao || null,
        preco: data.preco,
        estoqueMinimo: data.estoqueMinimo ?? "0",
        unidadeMedida: data.unidadeMedida,
        pesoGramas: data.pesoGramas ?? null,
        disponivelHoje: data.disponivelHoje,
        destaque: data.destaque,
        ativo: data.ativo,
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("produtos_slug_idx")
    ) {
      return {
        success: false,
        error: "Já existe um produto com esse nome.",
      };
    }
    console.error("Erro ao atualizar produto:", error);
    return { success: false, error: "Erro ao atualizar produto." };
  }
}

export async function toggleProdutoAtivo(
  id: number,
): Promise<ActionResult> {
  try {
    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, id),
    });

    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }

    await db
      .update(produtos)
      .set({ ativo: !produto.ativo, updatedAt: new Date() })
      .where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status do produto:", error);
    return { success: false, error: "Erro ao alterar status do produto." };
  }
}

export async function toggleProdutoDisponivel(
  id: number,
): Promise<ActionResult> {
  try {
    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, id),
    });

    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }

    await db
      .update(produtos)
      .set({ disponivelHoje: !produto.disponivelHoje, updatedAt: new Date() })
      .where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar disponibilidade do produto:", error);
    return { success: false, error: "Erro ao alterar disponibilidade." };
  }
}

export async function deleteProduto(
  id: number,
): Promise<ActionResult> {
  try {
    const produto = await db.query.produtos.findFirst({
      where: eq(produtos.id, id),
    });

    if (!produto) {
      return { success: false, error: "Produto não encontrado." };
    }

    await db
      .update(produtos)
      .set({ ativo: false, updatedAt: new Date() })
      .where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao desativar produto:", error);
    return { success: false, error: "Erro ao desativar produto." };
  }
}

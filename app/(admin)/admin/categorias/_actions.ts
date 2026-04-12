"use server";

import { db } from "@/db";
import { categorias, produtos } from "@/db/schema";
import { categoriaSchema } from "@/lib/validators/categoria";
import { slugify } from "@/lib/slugify";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export async function createCategoria(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      icone: formData.get("icone") || undefined,
      ordem: formData.get("ordem"),
    };

    const parsed = categoriaSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, descricao, icone, ordem } = parsed.data;
    const slug = slugify(nome);

    await db.insert(categorias).values({
      nome,
      slug,
      descricao: descricao || null,
      icone: icone || null,
      ordem,
    });

    revalidatePath("/admin/categorias");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("categorias_slug_idx")
    ) {
      return {
        success: false,
        error: "Já existe uma categoria com esse nome.",
      };
    }
    console.error("Erro ao criar categoria:", error);
    return { success: false, error: "Erro ao criar categoria." };
  }
}

export async function updateCategoria(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      descricao: formData.get("descricao") || undefined,
      icone: formData.get("icone") || undefined,
      ordem: formData.get("ordem"),
    };

    const parsed = categoriaSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, descricao, icone, ordem } = parsed.data;
    const slug = slugify(nome);

    await db
      .update(categorias)
      .set({
        nome,
        slug,
        descricao: descricao || null,
        icone: icone || null,
        ordem,
      })
      .where(eq(categorias.id, id));

    revalidatePath("/admin/categorias");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("categorias_slug_idx")
    ) {
      return {
        success: false,
        error: "Já existe uma categoria com esse nome.",
      };
    }
    console.error("Erro ao atualizar categoria:", error);
    return { success: false, error: "Erro ao atualizar categoria." };
  }
}

export async function toggleCategoriaAtivo(
  id: number
): Promise<ActionResult> {
  try {
    const categoria = await db.query.categorias.findFirst({
      where: eq(categorias.id, id),
    });

    if (!categoria) {
      return { success: false, error: "Categoria não encontrada." };
    }

    await db
      .update(categorias)
      .set({ ativo: !categoria.ativo })
      .where(eq(categorias.id, id));

    revalidatePath("/admin/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status da categoria:", error);
    return { success: false, error: "Erro ao alterar status da categoria." };
  }
}

export async function deleteCategoria(id: number): Promise<ActionResult> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(produtos)
      .where(eq(produtos.categoriaId, id));

    if (result && result.count > 0) {
      return {
        success: false,
        error: `Não é possível excluir. Existem ${result.count} produto(s) vinculado(s) a esta categoria.`,
      };
    }

    await db.delete(categorias).where(eq(categorias.id, id));

    revalidatePath("/admin/categorias");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return { success: false, error: "Erro ao excluir categoria." };
  }
}

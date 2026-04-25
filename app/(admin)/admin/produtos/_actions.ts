"use server";

import { db } from "@/db";
import { produtos, itensComanda, movimentacoesEstoque, perdasEstoque } from "@/db/schema";
import { produtoSchema } from "@/lib/validators/produto";
import { slugify } from "@/lib/slugify";
import { saveProductImage, deleteProductImage } from "@/lib/upload";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string; archived?: boolean };

function parseRaw(formData: FormData) {
  return {
    nome: formData.get("nome"),
    categoriaId: formData.get("categoriaId"),
    descricao: formData.get("descricao") || undefined,
    preco: formData.get("preco"),
    custoUnitario: formData.get("custoUnitario") || "0",
    estoqueMinimo: formData.get("estoqueMinimo") || "0",
    estoqueMaximo: formData.get("estoqueMaximo") || "0",
    unidadeMedida: formData.get("unidadeMedida"),
    pesoGramas: formData.get("pesoGramas") || undefined,
    disponivelHoje: formData.get("disponivelHoje") === "true",
    destaque: formData.get("destaque") === "true",
    ativo: formData.get("ativo") === "true",
  };
}

export async function createProduto(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const parsed = produtoSchema.safeParse(parseRaw(formData));

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const data = parsed.data;
    const slug = slugify(data.nome);

    let imagemUrl: string | null = null;
    const imagemFile = formData.get("imagem");
    if (imagemFile instanceof File && imagemFile.size > 0) {
      const uploaded = await saveProductImage(imagemFile);
      imagemUrl = uploaded?.url ?? null;
    }

    await db.insert(produtos).values({
      nome: data.nome,
      slug,
      categoriaId: data.categoriaId,
      descricao: data.descricao || null,
      preco: data.preco,
      custoUnitario: data.custoUnitario ?? "0",
      estoqueMinimo: data.estoqueMinimo ?? "0",
      estoqueMaximo: data.estoqueMaximo ?? "0",
      unidadeMedida: data.unidadeMedida,
      pesoGramas: data.pesoGramas ?? null,
      imagemUrl,
      disponivelHoje: data.disponivelHoje,
      destaque: data.destaque,
      ativo: data.ativo,
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/cardapio");
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
    if (error instanceof Error && error.message.includes("imagem")) {
      return { success: false, error: error.message };
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
    const parsed = produtoSchema.safeParse(parseRaw(formData));

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const data = parsed.data;
    const slug = slugify(data.nome);

    const produtoAtual = await db.query.produtos.findFirst({
      where: eq(produtos.id, id),
      columns: { imagemUrl: true },
    });

    const removerImagem = formData.get("removerImagem") === "true";
    const imagemFile = formData.get("imagem");
    const temNovaImagem =
      imagemFile instanceof File && imagemFile.size > 0;

    let imagemUrl: string | null | undefined = undefined;

    if (temNovaImagem) {
      const uploaded = await saveProductImage(imagemFile as File);
      imagemUrl = uploaded?.url ?? null;
      if (produtoAtual?.imagemUrl) {
        await deleteProductImage(produtoAtual.imagemUrl);
      }
    } else if (removerImagem) {
      imagemUrl = null;
      if (produtoAtual?.imagemUrl) {
        await deleteProductImage(produtoAtual.imagemUrl);
      }
    }

    await db
      .update(produtos)
      .set({
        nome: data.nome,
        slug,
        categoriaId: data.categoriaId,
        descricao: data.descricao || null,
        preco: data.preco,
        custoUnitario: data.custoUnitario ?? "0",
        estoqueMinimo: data.estoqueMinimo ?? "0",
        estoqueMaximo: data.estoqueMaximo ?? "0",
        unidadeMedida: data.unidadeMedida,
        pesoGramas: data.pesoGramas ?? null,
        ...(imagemUrl !== undefined ? { imagemUrl } : {}),
        disponivelHoje: data.disponivelHoje,
        destaque: data.destaque,
        ativo: data.ativo,
        updatedAt: new Date(),
      })
      .where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    revalidatePath(`/admin/produtos/${id}`);
    revalidatePath("/cardapio");
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
    if (error instanceof Error && error.message.includes("imagem")) {
      return { success: false, error: error.message };
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

    // Check for linked comanda items
    const [itensResult] = await db
      .select({ count: count() })
      .from(itensComanda)
      .where(eq(itensComanda.produtoId, id));

    const hasHistory = itensResult && itensResult.count > 0;

    if (hasHistory) {
      // Product has sales history — archive instead of deleting
      // to preserve historical comanda/report data
      await db
        .update(produtos)
        .set({ ativo: false, disponivelHoje: false, updatedAt: new Date() })
        .where(eq(produtos.id, id));

      revalidatePath("/admin/produtos");
      revalidatePath("/admin/caixa");
      revalidatePath("/cardapio");
      return { success: true, archived: true };
    }

    // No sales history — safe to delete permanently
    await db.delete(movimentacoesEstoque).where(eq(movimentacoesEstoque.produtoId, id));
    await db.delete(perdasEstoque).where(eq(perdasEstoque.produtoId, id));

    if (produto.imagemUrl) {
      await deleteProductImage(produto.imagemUrl);
    }

    await db.delete(produtos).where(eq(produtos.id, id));

    revalidatePath("/admin/produtos");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    return { success: false, error: "Erro ao excluir produto." };
  }
}

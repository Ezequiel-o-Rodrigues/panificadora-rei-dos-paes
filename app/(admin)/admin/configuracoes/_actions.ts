"use server";

import { db } from "@/db";
import { configuracoesSistema, garcons, comandas } from "@/db/schema";
import { garcomSchema } from "@/lib/validators/garcom";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export async function updateConfig(
  chave: string,
  valor: string
): Promise<ActionResult> {
  try {
    await db
      .insert(configuracoesSistema)
      .values({
        chave,
        valor,
        tipo: "text",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: configuracoesSistema.chave,
        set: {
          valor,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/admin/configuracoes");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar configuração:", error);
    return { success: false, error: "Erro ao atualizar configuração." };
  }
}

export async function createGarcom(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      codigo: formData.get("codigo"),
      ativo: formData.get("ativo") !== "false",
    };

    const parsed = garcomSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, codigo, ativo } = parsed.data;

    await db.insert(garcons).values({
      nome,
      codigo,
      ativo,
    });

    revalidatePath("/admin/configuracoes");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("garcons_codigo_unique")
    ) {
      return {
        success: false,
        error: "Já existe um garçom com esse código.",
      };
    }
    console.error("Erro ao criar garçom:", error);
    return { success: false, error: "Erro ao criar garçom." };
  }
}

export async function updateGarcom(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      codigo: formData.get("codigo"),
      ativo: formData.get("ativo") !== "false",
    };

    const parsed = garcomSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, codigo, ativo } = parsed.data;

    await db
      .update(garcons)
      .set({ nome, codigo, ativo })
      .where(eq(garcons.id, id));

    revalidatePath("/admin/configuracoes");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("garcons_codigo_unique")
    ) {
      return {
        success: false,
        error: "Já existe um garçom com esse código.",
      };
    }
    console.error("Erro ao atualizar garçom:", error);
    return { success: false, error: "Erro ao atualizar garçom." };
  }
}

export async function toggleGarcomAtivo(id: number): Promise<ActionResult> {
  try {
    const garcom = await db.query.garcons.findFirst({
      where: eq(garcons.id, id),
    });

    if (!garcom) {
      return { success: false, error: "Garçom não encontrado." };
    }

    await db
      .update(garcons)
      .set({ ativo: !garcom.ativo })
      .where(eq(garcons.id, id));

    revalidatePath("/admin/configuracoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status do garçom:", error);
    return { success: false, error: "Erro ao alterar status do garçom." };
  }
}

export async function deleteGarcom(id: number): Promise<ActionResult> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(comandas)
      .where(eq(comandas.garcomId, id));

    if (result && result.count > 0) {
      return {
        success: false,
        error: `Não é possível excluir. Existem ${result.count} comanda(s) vinculada(s) a este garçom.`,
      };
    }

    await db.delete(garcons).where(eq(garcons.id, id));

    revalidatePath("/admin/configuracoes");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir garçom:", error);
    return { success: false, error: "Erro ao excluir garçom." };
  }
}

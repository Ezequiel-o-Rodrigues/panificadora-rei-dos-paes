"use server";

import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { usuarioSchema, usuarioUpdateSchema } from "@/lib/validators/usuario";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export async function createUsuario(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = {
      nome: formData.get("nome"),
      email: formData.get("email"),
      senha: formData.get("senha"),
      perfil: formData.get("perfil") || "usuario",
      ativo: formData.get("ativo") === "true",
    };

    const parsed = usuarioSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, email, senha, perfil, ativo } = parsed.data;
    const senhaHash = await hash(senha, 10);

    await db.insert(usuarios).values({
      nome,
      email,
      senhaHash,
      perfil,
      ativo,
    });

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("usuarios_email_unique")
    ) {
      return {
        success: false,
        error: "Já existe um usuário com esse e-mail.",
      };
    }
    console.error("Erro ao criar usuário:", error);
    return { success: false, error: "Erro ao criar usuário." };
  }
}

export async function updateUsuario(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw: Record<string, unknown> = {
      nome: formData.get("nome"),
      email: formData.get("email"),
      perfil: formData.get("perfil") || "usuario",
      ativo: formData.get("ativo") === "true",
    };

    const senhaRaw = formData.get("senha");
    if (senhaRaw && String(senhaRaw).length > 0) {
      raw.senha = senhaRaw;
    }

    const parsed = usuarioUpdateSchema.safeParse(raw);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError?.message ?? "Dados inválidos" };
    }

    const { nome, email, senha, perfil, ativo } = parsed.data;

    const senhaHash = senha ? await hash(senha, 10) : undefined;

    await db
      .update(usuarios)
      .set({
        nome,
        email,
        perfil,
        ativo,
        updatedAt: new Date(),
        ...(senhaHash ? { senhaHash } : {}),
      })
      .where(eq(usuarios.id, id));

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("usuarios_email_unique")
    ) {
      return {
        success: false,
        error: "Já existe um usuário com esse e-mail.",
      };
    }
    console.error("Erro ao atualizar usuário:", error);
    return { success: false, error: "Erro ao atualizar usuário." };
  }
}

export async function toggleUsuarioAtivo(id: number): Promise<ActionResult> {
  try {
    const usuario = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, id),
    });

    if (!usuario) {
      return { success: false, error: "Usuário não encontrado." };
    }

    await db
      .update(usuarios)
      .set({ ativo: !usuario.ativo, updatedAt: new Date() })
      .where(eq(usuarios.id, id));

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar status do usuário:", error);
    return { success: false, error: "Erro ao alterar status do usuário." };
  }
}

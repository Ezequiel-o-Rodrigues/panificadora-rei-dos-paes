import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    name: string;
    email: string;
    perfil: "admin" | "usuario";
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.perfil !== "admin") redirect("/admin");
  return user;
}

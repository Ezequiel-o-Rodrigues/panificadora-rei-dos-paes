import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getUsuarios() {
  return db.query.usuarios.findMany({
    orderBy: [asc(usuarios.nome)],
  });
}

export async function getUsuarioById(id: number) {
  return db.query.usuarios.findFirst({
    where: eq(usuarios.id, id),
  });
}

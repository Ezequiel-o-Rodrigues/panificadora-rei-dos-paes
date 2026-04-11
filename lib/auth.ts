import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.query.usuarios.findFirst({
          where: eq(usuarios.email, email),
        });

        if (!user || !user.ativo) return null;

        const ok = await compare(password, user.senhaHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          name: user.nome,
          email: user.email,
          perfil: user.perfil,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
});

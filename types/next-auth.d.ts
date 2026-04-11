import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      perfil: "admin" | "usuario";
    } & DefaultSession["user"];
  }

  interface User {
    perfil: "admin" | "usuario";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    perfil: "admin" | "usuario";
  }
}

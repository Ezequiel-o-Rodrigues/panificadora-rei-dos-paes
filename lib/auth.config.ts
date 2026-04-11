import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isApiAdmin =
        nextUrl.pathname.startsWith("/api/") &&
        !nextUrl.pathname.startsWith("/api/auth");

      if (isAdminRoute || isApiAdmin) {
        if (!isLoggedIn) return false;
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfil = (user as { perfil?: string }).perfil ?? "usuario";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { perfil?: string }).perfil = token.perfil as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

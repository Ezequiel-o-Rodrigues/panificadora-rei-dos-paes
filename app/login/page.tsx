import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { Logo } from "@/components/shared/Logo";
import { auth, signIn } from "@/lib/auth";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (session?.user) redirect("/admin");

  const params = await searchParams;

  async function handleLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=${error.type}`);
      }
      throw error;
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-flame-500/25 blur-3xl"
      />
      <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-8 text-center font-display text-3xl font-bold text-ivory-50">
          Entrar no painel
        </h1>
        <p className="mt-1 text-center text-sm text-onyx-200">
          Acesso restrito a funcionários.
        </p>
        {params.error && (
          <div className="mt-6 rounded-xl border border-rust-500/50 bg-rust-500/15 px-4 py-3 text-sm text-rust-400">
            Email ou senha inválidos.
          </div>
        )}
        <form action={handleLogin} className="mt-6 space-y-4">
          <div>
            <label
              className="text-sm font-medium text-onyx-100"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-xl border border-onyx-600 bg-onyx-800/70 px-4 py-2.5 text-sm text-ivory-50 shadow-sm outline-none ring-flame-500/40 transition placeholder:text-onyx-400 focus:border-flame-500 focus:ring-2"
              placeholder="voce@reidospaes.com.br"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-onyx-100"
              htmlFor="password"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-xl border border-onyx-600 bg-onyx-800/70 px-4 py-2.5 text-sm text-ivory-50 shadow-sm outline-none ring-flame-500/40 transition focus:border-flame-500 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-gradient-to-br from-flame-400 via-flame-500 to-rust-600 px-5 py-3 text-sm font-bold text-onyx-950 shadow-flame transition hover:shadow-glow-lg"
          >
            Entrar
          </button>
        </form>
        <Link
          href="/"
          className="mt-6 block text-center text-xs text-onyx-300 transition hover:text-flame-400"
        >
          ← Voltar ao site
        </Link>
      </div>
    </div>
  );
}

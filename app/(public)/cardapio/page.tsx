import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos } from "@/db/schema";
import { formatBRL } from "@/lib/money";

export const metadata = {
  title: "Cardápio",
  description: "Conheça todos os pães, doces, salgados e bebidas da casa.",
};

export const revalidate = 60;

async function getCardapio() {
  try {
    const cats = await db.query.categorias.findMany({
      where: eq(categorias.ativo, true),
      orderBy: [asc(categorias.ordem), asc(categorias.nome)],
      with: {
        produtos: {
          where: eq(produtos.ativo, true),
          orderBy: [asc(produtos.nome)],
        },
      },
    });
    return cats;
  } catch {
    return [];
  }
}

export default async function CardapioPage() {
  const cats = await getCardapio();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <header className="mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-flame-300 backdrop-blur">
          Nosso cardápio
        </span>
        <h1 className="mt-4 font-display text-5xl font-bold text-ivory-50 sm:text-6xl">
          Fresquinho, <span className="text-gradient-flame">todo dia</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-onyx-200 sm:text-base">
          Produzimos tudo aqui mesmo, com ingredientes selecionados e receitas
          de família. Escolha seus preferidos e venha buscar no balcão.
        </p>
      </header>

      {cats.length === 0 ? (
        <div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center">
          <p className="text-sm text-onyx-200">
            Banco de dados ainda não configurado. Rode o seed:
          </p>
          <code className="mt-3 inline-block rounded-lg bg-onyx-950 px-4 py-2 text-xs text-flame-300">
            npm run db:seed
          </code>
        </div>
      ) : (
        <div className="space-y-16">
          {cats.map((cat) => (
            <section key={cat.id} id={cat.slug}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
                    {cat.icone && (
                      <span className="mr-3 text-2xl">{cat.icone}</span>
                    )}
                    {cat.nome}
                  </h2>
                  {cat.descricao && (
                    <p className="mt-1 text-sm text-onyx-300">{cat.descricao}</p>
                  )}
                </div>
                <span className="text-xs uppercase tracking-wider text-onyx-400">
                  {cat.produtos.length}{" "}
                  {cat.produtos.length === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.produtos.map((p) => (
                  <article
                    key={p.id}
                    className="group relative overflow-hidden rounded-3xl border border-onyx-700/80 bg-onyx-900/60 p-5 backdrop-blur-sm transition hover:-translate-y-1 hover:border-flame-500/60 hover:shadow-flame"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-flame-500/30 via-rust-600/15 to-transparent blur-2xl transition group-hover:scale-125"
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-xl font-bold text-ivory-50">
                          {p.nome}
                        </h3>
                        {p.descricao && (
                          <p className="mt-1 line-clamp-2 text-xs text-onyx-300">
                            {p.descricao}
                          </p>
                        )}
                      </div>
                      {p.destaque && (
                        <span className="shrink-0 rounded-full bg-gradient-to-br from-flame-400 to-rust-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-onyx-950 shadow-flame">
                          Top
                        </span>
                      )}
                    </div>
                    <div className="relative mt-5 flex items-end justify-between">
                      <span className="font-display text-2xl font-bold text-gradient-flame">
                        {formatBRL(p.preco)}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-onyx-400">
                        por {p.unidadeMedida}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

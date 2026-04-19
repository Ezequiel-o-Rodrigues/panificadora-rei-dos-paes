import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categorias, produtos } from "@/db/schema";
import { isFeatureEnabled, getFeatureConfig } from "@/lib/features";
import {
  CardapioInterativo,
  type CardapioCategoria,
} from "./_components/CardapioInterativo";

export const metadata = {
  title: "Cardápio",
  description: "Conheça todos os itens disponíveis no nosso cardápio.",
};

export const dynamic = "force-dynamic";

async function getCardapio(): Promise<CardapioCategoria[]> {
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
    return cats.map((c) => ({
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      descricao: c.descricao,
      icone: c.icone,
      produtos: c.produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        slug: p.slug,
        descricao: p.descricao,
        preco: p.preco,
        imagemUrl: p.imagemUrl,
        unidadeMedida: p.unidadeMedida,
        destaque: p.destaque,
      })),
    }));
  } catch {
    return [];
  }
}

interface CardapioPageProps {
  searchParams: Promise<{ mesa?: string }>;
}

export default async function CardapioPage({ searchParams }: CardapioPageProps) {
  const params = await searchParams;
  const cats = await getCardapio();
  const whatsappEnabled = isFeatureEnabled("whatsapp_orders");
  const whatsappConfig = getFeatureConfig("whatsapp_orders");
  const qrMesaEnabled = isFeatureEnabled("cardapio_qr_mesa");

  const mesaRaw = params.mesa?.trim();
  const mesaNumero =
    qrMesaEnabled && mesaRaw && /^\d+$/.test(mesaRaw)
      ? Number(mesaRaw)
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      {mesaNumero !== null && (
        <div className="mb-6 rounded-2xl border border-flame-500/40 bg-flame-500/10 px-5 py-4 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-flame-600">
            Você está na
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-flame-600">
            Mesa {mesaNumero}
          </p>
        </div>
      )}

      <header className="mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-flame-500/40 bg-flame-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-flame-600 backdrop-blur">
          Nosso cardápio
        </span>
        <h1 className="mt-4 font-display text-5xl font-bold text-onyx-900 sm:text-6xl">
          Nosso <span className="text-gradient-flame">cardápio</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-onyx-600 sm:text-base">
          Produzimos tudo aqui mesmo, com ingredientes selecionados. Escolha
          seus preferidos e venha buscar no balcão
          {whatsappEnabled ? " ou peça pelo WhatsApp" : ""}.
        </p>
      </header>

      {cats.length === 0 ? (
        <div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center">
          <p className="text-sm text-onyx-700">
            Banco de dados ainda não configurado. Rode o seed:
          </p>
          <code className="mt-3 inline-block rounded-lg bg-onyx-900 px-4 py-2 text-xs text-flame-300">
            npm run db:seed
          </code>
        </div>
      ) : (
        <CardapioInterativo
          categorias={cats}
          whatsappEnabled={whatsappEnabled}
          whatsappNumero={whatsappConfig?.numero}
          mesa={mesaNumero}
        />
      )}
    </div>
  );
}

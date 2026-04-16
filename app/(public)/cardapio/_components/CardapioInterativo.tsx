"use client";

import { useCallback, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { BotaoPedirWhatsApp } from "@/components/cardapio/BotaoPedirWhatsApp";
import type { PedidoItem } from "@/lib/modules/whatsapp/format-pedido";

export type CardapioProduto = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: string;
  imagemUrl: string | null;
  unidadeMedida: string;
  destaque: boolean;
};

export type CardapioCategoria = {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
  produtos: CardapioProduto[];
};

interface CardapioInterativoProps {
  categorias: CardapioCategoria[];
  whatsappEnabled: boolean;
  whatsappNumero?: string;
  mesa?: number | null;
}

function formatBRL(valor: number | string): string {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CardapioInterativo({
  categorias,
  whatsappEnabled,
  whatsappNumero,
  mesa,
}: CardapioInterativoProps) {
  const [carrinho, setCarrinho] = useState<Record<number, number>>({});

  const adicionar = useCallback((produtoId: number) => {
    setCarrinho((prev) => ({
      ...prev,
      [produtoId]: (prev[produtoId] ?? 0) + 1,
    }));
  }, []);

  const remover = useCallback((produtoId: number) => {
    setCarrinho((prev) => {
      const atual = prev[produtoId] ?? 0;
      if (atual <= 1) {
        const rest = { ...prev };
        delete rest[produtoId];
        return rest;
      }
      return { ...prev, [produtoId]: atual - 1 };
    });
  }, []);

  const itensPedido = useMemo<PedidoItem[]>(() => {
    const itens: PedidoItem[] = [];
    for (const cat of categorias) {
      for (const p of cat.produtos) {
        const qtd = carrinho[p.id];
        if (qtd && qtd > 0) {
          itens.push({
            nome: p.nome,
            quantidade: qtd,
            precoUnitario: Number(p.preco),
          });
        }
      }
    }
    return itens;
  }, [carrinho, categorias]);

  return (
    <>
      <div className="space-y-16">
        {categorias.map((cat) => (
          <section key={cat.id} id={cat.slug}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
                  {cat.icone && <span className="mr-3 text-2xl">{cat.icone}</span>}
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cat.produtos.map((p) => {
                const qtd = carrinho[p.id] ?? 0;
                return (
                  <article
                    key={p.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-onyx-700/80 bg-onyx-900/60 backdrop-blur-sm transition hover:-translate-y-1 hover:border-flame-500/60 hover:shadow-flame"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <ProductImage
                        src={p.imagemUrl}
                        alt={p.nome}
                        className="h-full w-full transition duration-500 group-hover:scale-105"
                        rounded="none"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      {p.destaque && (
                        <span className="absolute right-3 top-3 rounded-full bg-gradient-to-br from-flame-400 to-rust-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-onyx-950 shadow-flame">
                          Top
                        </span>
                      )}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-onyx-900/80 to-transparent"
                      />
                    </div>
                    <div className="relative flex flex-1 flex-col gap-3 p-5">
                      <div>
                        <h3 className="font-display text-xl font-bold text-ivory-50">
                          {p.nome}
                        </h3>
                        {p.descricao && (
                          <p className="mt-1 line-clamp-2 text-xs text-onyx-300">
                            {p.descricao}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-end justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="font-display text-2xl font-bold text-gradient-flame">
                            {formatBRL(p.preco)}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-onyx-400">
                            por {p.unidadeMedida}
                          </span>
                        </div>
                        {whatsappEnabled && (
                          <div className="flex items-center gap-2">
                            {qtd > 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => remover(p.id)}
                                  aria-label="Remover um"
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-flame-500/40 bg-flame-500/10 text-flame-300 transition hover:border-flame-500 hover:bg-flame-500/20"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[1.5rem] text-center font-semibold text-ivory-50">
                                  {qtd}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adicionar(p.id)}
                                  aria-label="Adicionar um"
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-flame-500/40 bg-flame-500/10 text-flame-300 transition hover:border-flame-500 hover:bg-flame-500/20"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => adicionar(p.id)}
                                className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-flame-500 to-flame-600 px-3 text-xs font-bold text-white shadow-lg shadow-flame-500/25 transition hover:from-flame-400 hover:to-flame-500"
                              >
                                <Plus className="h-4 w-4" />
                                Adicionar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {whatsappEnabled && (
        <BotaoPedirWhatsApp
          itens={itensPedido}
          numero={whatsappNumero}
          mesa={mesa}
        />
      )}
    </>
  );
}

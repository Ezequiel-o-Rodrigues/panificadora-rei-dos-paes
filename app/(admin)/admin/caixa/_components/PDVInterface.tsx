"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Lock,
  PackagePlus,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, Select } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  adicionarItem,
  atualizarGarcomComanda,
  cancelarComanda,
  criarComanda,
  removerItemComanda,
  removerItemLivre,
} from "../_actions";
import type {
  CategoriaPDV,
  ComandaPDV,
  ConfigGorjeta,
  GarcomPDV,
  ProdutoPDV,
  ResumoSessao,
} from "../_queries";
import { QuantidadeDialog } from "./QuantidadeDialog";
import { ItemLivreDialog } from "./ItemLivreDialog";
import { FinalizarComandaDialog } from "./FinalizarComandaDialog";
import { FecharCaixaDialog } from "./FecharCaixaDialog";

interface SessaoPDV {
  id: number;
  valorAbertura: string;
  status: string;
  dataAbertura: Date | string;
}

interface PDVInterfaceProps {
  sessao: SessaoPDV;
  comandasAbertas: ComandaPDV[];
  produtos: ProdutoPDV[];
  categorias: CategoriaPDV[];
  garcons: GarcomPDV[];
  configGorjeta: ConfigGorjeta;
  resumo: ResumoSessao;
}

export function PDVInterface({
  sessao,
  comandasAbertas,
  produtos,
  categorias,
  garcons,
  configGorjeta,
  resumo,
}: PDVInterfaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [comandaAtivaId, setComandaAtivaId] = useState<number | null>(
    comandasAbertas[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null);

  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoPDV | null>(
    null,
  );
  const [itemLivreOpen, setItemLivreOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [closeCaixaOpen, setCloseCaixaOpen] = useState(false);

  const comandaAtiva = useMemo(
    () => comandasAbertas.find((c) => c.id === comandaAtivaId) ?? null,
    [comandasAbertas, comandaAtivaId],
  );

  // Se a comanda ativa deixar de existir (ex: foi finalizada/cancelada),
  // troca automaticamente para outra aberta (ou null).
  useEffect(() => {
    if (
      comandaAtivaId !== null &&
      !comandasAbertas.find((c) => c.id === comandaAtivaId)
    ) {
      setComandaAtivaId(comandasAbertas[0]?.id ?? null);
    }
  }, [comandasAbertas, comandaAtivaId]);

  const produtosFiltrados = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return produtos.filter((p) => {
      if (categoriaFiltro && p.categoriaId !== categoriaFiltro) return false;
      if (!searchLower) return true;
      return p.nome.toLowerCase().includes(searchLower);
    });
  }, [produtos, search, categoriaFiltro]);

  const subtotalComanda = useMemo(() => {
    if (!comandaAtiva) return 0;
    return [
      ...comandaAtiva.itens.map((i) => Number(i.subtotal)),
      ...comandaAtiva.itensLivres.map((i) => Number(i.subtotal)),
    ].reduce((acc, n) => acc + n, 0);
  }, [comandaAtiva]);

  const gorjetaAtual = useMemo(() => {
    if (!comandaAtiva) return 0;
    return Number(comandaAtiva.taxaGorjeta ?? 0);
  }, [comandaAtiva]);

  const totalComanda = subtotalComanda + gorjetaAtual;

  // -------- Handlers --------

  function handleNovaComanda() {
    startTransition(async () => {
      const formData = new FormData();
      const result = await criarComanda(sessao.id, formData);
      if (result.success && result.data) {
        toast.success("Comanda criada!");
        setComandaAtivaId(result.data.comandaId);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao criar comanda");
      }
    });
  }

  function handleSelecionarProduto(produto: ProdutoPDV) {
    if (!comandaAtiva) {
      toast.error("Crie uma comanda antes de adicionar itens");
      return;
    }
    setProdutoSelecionado(produto);
  }

  function handleAdicionarProduto(quantidade: number) {
    if (!comandaAtiva || !produtoSelecionado) return;
    const produto = produtoSelecionado;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("produtoId", String(produto.id));
      formData.set("quantidade", String(quantidade));

      const result = await adicionarItem(comandaAtiva.id, formData);
      if (result.success) {
        toast.success(`${produto.nome} adicionado`);
        setProdutoSelecionado(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao adicionar item");
      }
    });
  }

  function handleRemoverItemProduto(itemId: number) {
    if (!comandaAtiva) return;
    const comandaId = comandaAtiva.id;
    startTransition(async () => {
      const result = await removerItemComanda(itemId, comandaId);
      if (result.success) {
        toast.success("Item removido");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao remover");
      }
    });
  }

  function handleRemoverItemLivreClick(itemId: number) {
    if (!comandaAtiva) return;
    const comandaId = comandaAtiva.id;
    startTransition(async () => {
      const result = await removerItemLivre(itemId, comandaId);
      if (result.success) {
        toast.success("Item removido");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao remover");
      }
    });
  }

  function handleGarcomChange(garcomId: number | null) {
    if (!comandaAtiva) return;
    const comandaId = comandaAtiva.id;
    startTransition(async () => {
      const result = await atualizarGarcomComanda(comandaId, garcomId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao atualizar garçom");
      }
    });
  }

  function handleCancelarComanda() {
    if (!comandaAtiva) return;
    const comandaId = comandaAtiva.id;
    startTransition(async () => {
      const result = await cancelarComanda(comandaId);
      if (result.success) {
        toast.success("Comanda cancelada");
        setCancelOpen(false);
        setComandaAtivaId(
          comandasAbertas.find((c) => c.id !== comandaId)?.id ?? null,
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao cancelar comanda");
      }
    });
  }

  const garcomOptions = garcons.map((g) => ({
    value: String(g.id),
    label: g.nome,
  }));

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/caixa">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ivory-50 font-display">
                PDV — Caixa #{sessao.id}
              </h1>
              <Badge variant="success">Aberta</Badge>
            </div>
            <div className="text-xs text-onyx-400">
              Aberto em {formatTime(sessao.dataAbertura)} — Abertura{" "}
              {formatBRL(sessao.valorAbertura)}
            </div>
          </div>
        </div>

        <Button variant="secondary" onClick={() => setCloseCaixaOpen(true)}>
          <Lock className="h-4 w-4" />
          Fechar Caixa
        </Button>
      </div>

      {/* Abas de comandas */}
      <div className="flex flex-wrap items-center gap-2">
        {comandasAbertas.map((c) => (
          <button
            key={c.id}
            onClick={() => setComandaAtivaId(c.id)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition",
              c.id === comandaAtivaId
                ? "border-flame-500/60 bg-flame-500/15 text-flame-300"
                : "border-onyx-700 bg-onyx-800/60 text-onyx-200 hover:border-onyx-600",
            )}
          >
            #{c.numero} — {formatBRL(c.valorTotal)}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNovaComanda}
          disabled={isPending}
        >
          <Plus className="h-4 w-4" />
          Nova Comanda
        </Button>
      </div>

      {/* Layout de duas colunas */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        {/* Coluna esquerda — produtos */}
        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-onyx-400" />
              <input
                type="search"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-onyx-700 bg-onyx-800/70 pl-9 pr-3 text-sm text-ivory-50 placeholder:text-onyx-400 transition focus:outline-none focus:ring-2 focus:ring-flame-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-2 overflow-x-auto">
              <button
                onClick={() => setCategoriaFiltro(null)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  categoriaFiltro === null
                    ? "border-flame-500/60 bg-flame-500/15 text-flame-300"
                    : "border-onyx-700 bg-onyx-800/60 text-onyx-300 hover:border-onyx-600",
                )}
              >
                Todas
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFiltro(cat.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    categoriaFiltro === cat.id
                      ? "border-flame-500/60 bg-flame-500/15 text-flame-300"
                      : "border-onyx-700 bg-onyx-800/60 text-onyx-300 hover:border-onyx-600",
                  )}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de produtos */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {produtosFiltrados.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-onyx-400">
                Nenhum produto disponível.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {produtosFiltrados.map((p) => {
                  const estoque = Number(p.estoqueAtual);
                  const estoqueMin = Number(p.estoqueMinimo);
                  const semEstoque = estoque <= 0;
                  const estoqueBaixo = !semEstoque && estoque <= estoqueMin;
                  const mostrarEstoque = p.unidadeMedida !== "un";
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelecionarProduto(p)}
                      disabled={semEstoque || !comandaAtiva || isPending}
                      className={cn(
                        "group flex min-h-[7.5rem] flex-col items-start gap-1 rounded-xl border border-onyx-700 bg-onyx-800/60 p-3 text-left transition",
                        "hover:border-flame-500/50 hover:bg-onyx-800 active:scale-[0.98]",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-onyx-700",
                      )}
                    >
                      <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ivory-50">
                        {p.nome}
                      </div>
                      <div className="text-base font-bold text-flame-400">
                        {formatBRL(p.preco)}
                      </div>
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate text-[10px] text-onyx-400">
                          {p.categoria.nome}
                        </span>
                        {semEstoque ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-rust-400">
                            <AlertTriangle className="h-3 w-3" />
                            Sem estoque
                          </span>
                        ) : estoqueBaixo ? (
                          <span className="text-[10px] font-semibold text-amber-400">
                            Estoque baixo
                          </span>
                        ) : mostrarEstoque ? (
                          <span className="text-[10px] text-onyx-500">
                            {estoque.toFixed(2)} {p.unidadeMedida}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita — comanda atual */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm">
          {!comandaAtiva ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <Receipt className="h-10 w-10 text-onyx-500" />
              <div>
                <div className="font-semibold text-ivory-100">
                  Nenhuma comanda ativa
                </div>
                <p className="mt-1 text-sm text-onyx-400">
                  Crie uma nova comanda para começar.
                </p>
              </div>
              <Button
                onClick={handleNovaComanda}
                disabled={isPending}
                size="lg"
              >
                <Plus className="h-4 w-4" />
                Nova Comanda
              </Button>
            </div>
          ) : (
            <>
              <div className="border-b border-onyx-800/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-onyx-400">Comanda</div>
                    <div className="text-2xl font-bold text-ivory-50 font-display">
                      #{comandaAtiva.numero}
                    </div>
                  </div>
                  <div className="text-right text-xs text-onyx-400">
                    Aberta às {formatTime(comandaAtiva.dataAbertura)}
                  </div>
                </div>

                <div className="mt-3">
                  <Select
                    label="Garçom"
                    placeholder="Sem garçom"
                    options={garcomOptions}
                    value={String(comandaAtiva.garcomId ?? "")}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleGarcomChange(value ? Number(value) : null);
                    }}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {comandaAtiva.itens.length === 0 &&
                comandaAtiva.itensLivres.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-onyx-400">
                    <Receipt className="h-6 w-6 text-onyx-500" />
                    Adicione itens para iniciar a venda.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {comandaAtiva.itens.map((item) => (
                      <li
                        key={`p-${item.id}`}
                        className="flex items-start justify-between gap-2 rounded-xl border border-onyx-800 bg-onyx-800/40 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ivory-50">
                            {item.produto.nome}
                          </div>
                          <div className="mt-0.5 text-xs text-onyx-400">
                            {Number(item.quantidade).toFixed(
                              item.produto.unidadeMedida === "un" ? 0 : 3,
                            )}{" "}
                            × {formatBRL(item.precoUnitario)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-flame-400">
                            {formatBRL(item.subtotal)}
                          </div>
                          <button
                            onClick={() => handleRemoverItemProduto(item.id)}
                            disabled={isPending}
                            className="rounded-lg p-1 text-onyx-400 transition hover:bg-rust-500/15 hover:text-rust-400 disabled:opacity-50 cursor-pointer"
                            aria-label="Remover item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                    {comandaAtiva.itensLivres.map((item) => (
                      <li
                        key={`l-${item.id}`}
                        className="flex items-start justify-between gap-2 rounded-xl border border-onyx-800 bg-onyx-800/40 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <Badge variant="info">Livre</Badge>
                            <div className="truncate text-sm font-semibold text-ivory-50">
                              {item.descricao}
                            </div>
                          </div>
                          <div className="mt-0.5 text-xs text-onyx-400">
                            {Number(item.quantidade).toFixed(3)} ×{" "}
                            {formatBRL(item.precoUnitario)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-flame-400">
                            {formatBRL(item.subtotal)}
                          </div>
                          <button
                            onClick={() =>
                              handleRemoverItemLivreClick(item.id)
                            }
                            disabled={isPending}
                            className="rounded-lg p-1 text-onyx-400 transition hover:bg-rust-500/15 hover:text-rust-400 disabled:opacity-50 cursor-pointer"
                            aria-label="Remover item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setItemLivreOpen(true)}
                    disabled={isPending}
                  >
                    <PackagePlus className="h-4 w-4" />
                    Item livre
                  </Button>
                </div>
              </div>

              <div className="border-t border-onyx-800/70 p-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between text-onyx-300">
                    <dt>Subtotal</dt>
                    <dd className="font-semibold text-ivory-100">
                      {formatBRL(subtotalComanda)}
                    </dd>
                  </div>
                  {gorjetaAtual > 0 && (
                    <div className="flex justify-between text-onyx-300">
                      <dt>Gorjeta</dt>
                      <dd className="font-semibold text-ivory-100">
                        {formatBRL(gorjetaAtual)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 text-base">
                    <dt className="font-semibold text-ivory-100">Total</dt>
                    <dd className="text-xl font-bold text-flame-400">
                      {formatBRL(totalComanda)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setFinalizeOpen(true)}
                    disabled={
                      isPending ||
                      (comandaAtiva.itens.length === 0 &&
                        comandaAtiva.itensLivres.length === 0)
                    }
                  >
                    Finalizar
                  </Button>
                  <Button
                    className="w-full"
                    variant="danger"
                    onClick={() => setCancelOpen(true)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancelar comanda
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Diálogos */}
      {produtoSelecionado && (
        <QuantidadeDialog
          open={!!produtoSelecionado}
          onOpenChange={(open) => !open && setProdutoSelecionado(null)}
          produto={produtoSelecionado}
          onConfirm={handleAdicionarProduto}
          loading={isPending}
        />
      )}

      {comandaAtiva && (
        <>
          <ItemLivreDialog
            open={itemLivreOpen}
            onOpenChange={setItemLivreOpen}
            comandaId={comandaAtiva.id}
          />

          <FinalizarComandaDialog
            open={finalizeOpen}
            onOpenChange={setFinalizeOpen}
            comandaId={comandaAtiva.id}
            subtotal={subtotalComanda}
            configGorjeta={configGorjeta}
          />
        </>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar comanda?"
        message="Todos os itens da comanda serão descartados. Esta ação não pode ser desfeita."
        confirmLabel="Sim, cancelar"
        onConfirm={handleCancelarComanda}
        loading={isPending}
      />

      <FecharCaixaDialog
        open={closeCaixaOpen}
        onOpenChange={setCloseCaixaOpen}
        sessao={sessao}
        resumo={resumo}
        comandasAbertasCount={comandasAbertas.length}
      />
    </div>
  );
}

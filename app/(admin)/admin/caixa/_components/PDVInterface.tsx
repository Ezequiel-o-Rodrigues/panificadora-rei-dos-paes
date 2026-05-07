"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Lock,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, Select, useSidebar } from "@/components/admin";
import { ProductImage } from "@/components/shared/ProductImage";
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

// Unidades em que 1 clique = 1 unidade (sem diálogo).
// Para kg/g/litro/ml/metro mantemos o diálogo para digitar a quantidade.
const UNIDADES_CONTAVEIS = new Set([
  "un",
  "fatia",
  "pacote",
  "porcao",
  "combo",
]);

function isUnidadeContavel(unidade: string) {
  return UNIDADES_CONTAVEIS.has(unidade);
}

type ItemOtimista = {
  tempId: string;
  comandaId: number;
  produtoId: number;
  produtoNome: string;
  unidadeMedida: string;
  quantidade: number;
  precoUnitario: string;
  subtotal: number;
  confirmed: boolean;
};

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
  const { collapsed, toggle: toggleSidebar } = useSidebar();

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

  // UI otimista: itens que aparecem na comanda imediatamente,
  // antes do servidor confirmar. Limpos quando o servidor responde via refresh.
  const [optimisticItems, setOptimisticItems] = useState<ItemOtimista[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Quando o servidor confirma os itens (props mudam), descartamos otimistas
  // já marcados como confirmados. Otimistas ainda em voo permanecem.
  const itensServerKey = useMemo(() => {
    if (!comandaAtiva) return "";
    return (
      comandaAtiva.itens.map((i) => i.id).join(",") +
      "|" +
      comandaAtiva.itensLivres.map((i) => i.id).join(",")
    );
  }, [comandaAtiva]);

  useEffect(() => {
    setOptimisticItems((prev) => prev.filter((o) => !o.confirmed));
  }, [itensServerKey]);

  const optimisticPorComanda = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of optimisticItems) {
      map.set(o.comandaId, (map.get(o.comandaId) ?? 0) + o.subtotal);
    }
    return map;
  }, [optimisticItems]);

  const optimisticItensAtiva = useMemo(() => {
    if (!comandaAtiva) return [] as ItemOtimista[];
    return optimisticItems.filter((o) => o.comandaId === comandaAtiva.id);
  }, [optimisticItems, comandaAtiva]);

  // Linhas consolidadas da comanda: agrupa itens por produtoId (real + otimista)
  // de modo que 8 cliques no mesmo produto virem "8× Pão Francês" em vez de
  // 8 linhas duplicadas. Itens livres não são agrupados (descrição livre).
  type LinhaProduto = {
    key: string;
    produtoId: number;
    produtoNome: string;
    unidadeMedida: string;
    precoUnitario: string;
    quantidade: number;
    subtotal: number;
    realItemIds: number[];
    pendente: boolean;
  };

  const linhasProduto = useMemo<LinhaProduto[]>(() => {
    if (!comandaAtiva) return [];
    const map = new Map<number, LinhaProduto>();

    for (const item of comandaAtiva.itens) {
      const linha = map.get(item.produtoId) ?? {
        key: `p-${item.produtoId}`,
        produtoId: item.produtoId,
        produtoNome: item.produto.nome,
        unidadeMedida: item.produto.unidadeMedida,
        precoUnitario: item.precoUnitario,
        quantidade: 0,
        subtotal: 0,
        realItemIds: [],
        pendente: false,
      };
      linha.quantidade += Number(item.quantidade);
      linha.subtotal += Number(item.subtotal);
      linha.realItemIds.push(item.id);
      map.set(item.produtoId, linha);
    }

    for (const o of optimisticItensAtiva) {
      const linha = map.get(o.produtoId) ?? {
        key: `p-${o.produtoId}`,
        produtoId: o.produtoId,
        produtoNome: o.produtoNome,
        unidadeMedida: o.unidadeMedida,
        precoUnitario: o.precoUnitario,
        quantidade: 0,
        subtotal: 0,
        realItemIds: [],
        pendente: false,
      };
      linha.quantidade += o.quantidade;
      linha.subtotal += o.subtotal;
      if (!o.confirmed) linha.pendente = true;
      map.set(o.produtoId, linha);
    }

    return Array.from(map.values());
  }, [comandaAtiva, optimisticItensAtiva]);

  const subtotalComanda = useMemo(() => {
    if (!comandaAtiva) return 0;
    const itensSubtotal = linhasProduto.reduce((acc, l) => acc + l.subtotal, 0);
    const livresSubtotal = comandaAtiva.itensLivres.reduce(
      (acc, i) => acc + Number(i.subtotal),
      0,
    );
    return itensSubtotal + livresSubtotal;
  }, [comandaAtiva, linhasProduto]);

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

  function scheduleRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 80);
  }

  async function quickAddProduto(produto: ProdutoPDV, quantidade: number) {
    if (!comandaAtiva) {
      toast.error("Crie uma comanda antes de adicionar itens");
      return;
    }
    if (Number(produto.estoqueAtual) <= 0) {
      toast.warning(`${produto.nome}: estoque zerado, vendendo mesmo assim`);
    }

    const comandaId = comandaAtiva.id;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const subtotal = quantidade * Number(produto.preco);

    setOptimisticItems((prev) => [
      ...prev,
      {
        tempId,
        comandaId,
        produtoId: produto.id,
        produtoNome: produto.nome,
        unidadeMedida: produto.unidadeMedida,
        quantidade,
        precoUnitario: produto.preco,
        subtotal,
        confirmed: false,
      },
    ]);

    const formData = new FormData();
    formData.set("produtoId", String(produto.id));
    formData.set("quantidade", String(quantidade));

    const result = await adicionarItem(comandaId, formData);

    if (!result.success) {
      setOptimisticItems((prev) => prev.filter((o) => o.tempId !== tempId));
      toast.error(result.error ?? "Erro ao adicionar item");
      return;
    }

    setOptimisticItems((prev) =>
      prev.map((o) => (o.tempId === tempId ? { ...o, confirmed: true } : o)),
    );
    scheduleRefresh();
  }

  function handleSelecionarProduto(produto: ProdutoPDV) {
    if (!comandaAtiva) {
      toast.error("Crie uma comanda antes de adicionar itens");
      return;
    }
    if (isUnidadeContavel(produto.unidadeMedida)) {
      void quickAddProduto(produto, 1);
    } else {
      setProdutoSelecionado(produto);
    }
  }

  function handleAdicionarProduto(quantidade: number) {
    if (!produtoSelecionado) return;
    const produto = produtoSelecionado;
    setProdutoSelecionado(null);
    void quickAddProduto(produto, quantidade);
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

  function handleRemoverLinhaProduto(realItemIds: number[]) {
    if (!comandaAtiva || realItemIds.length === 0) return;
    const comandaId = comandaAtiva.id;
    startTransition(async () => {
      const results = await Promise.all(
        realItemIds.map((id) => removerItemComanda(id, comandaId)),
      );
      const erro = results.find((r) => !r.success);
      if (erro) {
        toast.error(erro.error ?? "Erro ao remover");
      } else {
        toast.success("Item removido");
        router.refresh();
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
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            title={collapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}
            className="hidden md:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
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
        {comandasAbertas.map((c) => {
          const valorOtim = optimisticPorComanda.get(c.id) ?? 0;
          const totalDisplay = Number(c.valorTotal) + valorOtim;
          return (
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
              #{c.numero} — {formatBRL(totalDisplay)}
            </button>
          );
        })}
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
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
                      disabled={!comandaAtiva}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-2xl border border-onyx-700 bg-onyx-800/60 text-left transition",
                        "hover:border-flame-500/60 hover:bg-onyx-800 hover:shadow-lg hover:shadow-flame-500/10 active:scale-[0.98]",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-onyx-700 disabled:hover:shadow-none",
                        semEstoque && "opacity-80",
                      )}
                    >
                      <div className="relative aspect-square w-full">
                        <ProductImage
                          src={p.imagemUrl}
                          alt={p.nome}
                          className="h-full w-full"
                          rounded="none"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                        />
                        {semEstoque && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <span className="flex items-center gap-1 rounded-full bg-rust-500/20 px-3 py-1 text-[11px] font-semibold text-rust-300 border border-rust-500/40">
                              <AlertTriangle className="h-3 w-3" />
                              Sem estoque
                            </span>
                          </div>
                        )}
                        {!semEstoque && estoqueBaixo && (
                          <div className="absolute right-2 top-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                            Baixo
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ivory-50">
                          {p.nome}
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-2">
                          <div className="text-base font-bold text-flame-400">
                            {formatBRL(p.preco)}
                          </div>
                          {!semEstoque && mostrarEstoque && (
                            <span className="shrink-0 text-[10px] text-onyx-500">
                              {estoque.toFixed(2)} {p.unidadeMedida}
                            </span>
                          )}
                        </div>
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
                {linhasProduto.length === 0 &&
                comandaAtiva.itensLivres.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-onyx-400">
                    <Receipt className="h-6 w-6 text-onyx-500" />
                    Adicione itens para iniciar a venda.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {linhasProduto.map((linha) => {
                      const apenasOtimista = linha.realItemIds.length === 0;
                      const isUn = linha.unidadeMedida === "un" ||
                        isUnidadeContavel(linha.unidadeMedida);
                      return (
                        <li
                          key={linha.key}
                          className={cn(
                            "flex items-start justify-between gap-2 rounded-xl border p-3 transition",
                            apenasOtimista
                              ? "border-flame-500/30 bg-flame-500/5"
                              : "border-onyx-800 bg-onyx-800/40",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-ivory-50">
                              {linha.pendente && (
                                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-flame-400" />
                              )}
                              <span className="truncate">{linha.produtoNome}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-onyx-400">
                              {linha.quantidade.toFixed(isUn ? 0 : 3)}
                              {" "}
                              {linha.unidadeMedida}
                              {" × "}
                              {formatBRL(linha.precoUnitario)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-flame-400">
                              {formatBRL(linha.subtotal)}
                            </div>
                            <button
                              onClick={() =>
                                handleRemoverLinhaProduto(linha.realItemIds)
                              }
                              disabled={isPending || apenasOtimista}
                              className="rounded-lg p-1 text-onyx-400 transition hover:bg-rust-500/15 hover:text-rust-400 disabled:opacity-50 cursor-pointer"
                              aria-label="Remover item"
                              title={
                                linha.quantidade > 1
                                  ? `Remover todas as ${linha.quantidade} unidades`
                                  : "Remover"
                              }
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
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

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { Input, Button, Card } from "@/components/admin";
import { formatBRL } from "@/lib/money";
import { registrarInventario } from "../../_actions";

interface InventoryItem {
  id: number;
  nome: string;
  categoriaNome: string;
  estoqueAtual: string;
  unidadeMedida: string;
  preco: string;
}

interface InventoryFormProps {
  produtos: InventoryItem[];
}

function formatQtd(valor: string | number, unidade: string): string {
  const n = Number(valor);
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${unidade}`;
}

export function InventoryForm({ produtos }: InventoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  // Map de id -> string digitada
  const [contagens, setContagens] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const p of produtos) {
      init[p.id] = "";
    }
    return init;
  });

  const filtered = useMemo(() => {
    if (!search) return produtos;
    const term = search.toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        p.categoriaNome.toLowerCase().includes(term),
    );
  }, [produtos, search]);

  const totaisPreview = useMemo(() => {
    let totalDiferencas = 0;
    let totalPerdas = 0;
    let valorPerdasPreview = 0;

    for (const p of produtos) {
      const val = contagens[p.id];
      if (val === "" || val == null) continue;
      const contada = Number(val);
      if (Number.isNaN(contada)) continue;
      const atual = Number(p.estoqueAtual);
      const diff = contada - atual;
      if (diff === 0) continue;
      totalDiferencas += 1;
      if (diff < 0) {
        totalPerdas += 1;
        valorPerdasPreview += Math.abs(diff) * Number(p.preco);
      }
    }

    return {
      totalDiferencas,
      totalPerdas,
      valorPerdasPreview,
    };
  }, [contagens, produtos]);

  function handleChange(id: number, value: string) {
    setContagens((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const entries: { produtoId: number; quantidadeContada: number }[] = [];
    for (const p of produtos) {
      const val = contagens[p.id];
      if (val === "" || val == null) continue;
      const num = Number(val);
      if (Number.isNaN(num) || num < 0) continue;
      entries.push({ produtoId: p.id, quantidadeContada: num });
    }

    if (entries.length === 0) {
      toast.error("Informe a contagem de pelo menos um produto.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      entries.forEach((entry, idx) => {
        formData.set(`itens[${idx}][produtoId]`, String(entry.produtoId));
        formData.set(
          `itens[${idx}][quantidadeContada]`,
          String(entry.quantidadeContada),
        );
      });

      const result = await registrarInventario(formData);

      if (result.success) {
        toast.success(
          `Inventário registrado! ${result.data?.totalItens ?? 0} ajuste(s), ${result.data?.totalPerdas ?? 0} perda(s).`,
        );
        router.push("/admin/estoque");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao registrar inventário.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">
          A contagem física ajusta o estoque e registra perdas automaticamente
          quando a quantidade contada for menor que o estoque do sistema. Itens
          em branco são ignorados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs text-onyx-400">Ajustes pendentes</span>
          <span className="text-2xl font-semibold text-ivory-50">
            {totaisPreview.totalDiferencas}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs text-onyx-400">Perdas previstas</span>
          <span className="text-2xl font-semibold text-rust-400">
            {totaisPreview.totalPerdas}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs text-onyx-400">Valor de perda estimado</span>
          <span className="text-2xl font-semibold text-rust-400">
            {formatBRL(totaisPreview.valorPerdasPreview)}
          </span>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-onyx-400" />
        <Input
          placeholder="Buscar produto ou categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-onyx-800/70">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Produto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Categoria
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Sistema
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Contado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400">
                Diferença
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-800/40">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-onyx-400"
                >
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const val = contagens[p.id];
                const contada = val === "" || val == null ? null : Number(val);
                const diff =
                  contada != null && !Number.isNaN(contada)
                    ? contada - Number(p.estoqueAtual)
                    : null;
                return (
                  <tr key={p.id} className="hover:bg-onyx-800/40 transition">
                    <td className="px-4 py-3 font-medium text-ivory-50">
                      {p.nome}
                    </td>
                    <td className="px-4 py-3 text-onyx-300">
                      {p.categoriaNome}
                    </td>
                    <td className="px-4 py-3 text-onyx-200">
                      {formatQtd(p.estoqueAtual, p.unidadeMedida)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={val ?? ""}
                        onChange={(e) => handleChange(p.id, e.target.value)}
                        className="h-9 w-28 rounded-lg border border-onyx-700 bg-onyx-800/70 px-2 text-sm text-ivory-50 focus:border-flame-500/40 focus:outline-none focus:ring-2 focus:ring-flame-500/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {diff == null ? (
                        <span className="text-onyx-500">--</span>
                      ) : diff === 0 ? (
                        <span className="text-onyx-400">Sem alteração</span>
                      ) : diff > 0 ? (
                        <span className="font-semibold text-emerald-400">
                          +{diff.toFixed(3)} {p.unidadeMedida}
                        </span>
                      ) : (
                        <span className="font-semibold text-rust-400">
                          {diff.toFixed(3)} {p.unidadeMedida} (perda{" "}
                          {formatBRL(Math.abs(diff) * Number(p.preco))})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          Salvar Inventário
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/estoque")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

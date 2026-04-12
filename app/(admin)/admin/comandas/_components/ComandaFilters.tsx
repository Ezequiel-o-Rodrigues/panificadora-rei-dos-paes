"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, DateRangePicker, Button } from "@/components/admin";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ComandaFiltersProps {
  garcons: { id: number; nome: string }[];
  formasPagamento: ReadonlyArray<{ value: string; label: string }>;
}

const STATUS_CHIPS = [
  { value: "", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "finalizada", label: "Finalizadas" },
  { value: "cancelada", label: "Canceladas" },
];

export function ComandaFilters({
  garcons,
  formasPagamento,
}: ComandaFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus = searchParams.get("status") ?? "";
  const currentGarcom = searchParams.get("garcomId") ?? "";
  const currentForma = searchParams.get("formaPagamento") ?? "";
  const currentStart = searchParams.get("startDate") ?? "";
  const currentEnd = searchParams.get("endDate") ?? "";

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        currentStatus ||
          currentGarcom ||
          currentForma ||
          currentStart ||
          currentEnd,
      ),
    [currentStatus, currentGarcom, currentForma, currentStart, currentEnd],
  );

  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`/admin/comandas?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push("/admin/comandas", { scroll: false });
    });
  }, [router]);

  const garcomOptions = useMemo(
    () => garcons.map((g) => ({ value: String(g.id), label: g.nome })),
    [garcons],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-onyx-800/70 bg-onyx-900/60 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_CHIPS.map((chip) => {
          const isActive = currentStatus === chip.value;
          return (
            <button
              key={chip.value || "todas"}
              type="button"
              disabled={isPending}
              onClick={() => updateParam({ status: chip.value })}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition cursor-pointer",
                isActive
                  ? "border-flame-500/50 bg-flame-500/15 text-flame-300"
                  : "border-onyx-700 bg-onyx-800/60 text-onyx-300 hover:border-onyx-600 hover:text-ivory-50",
                isPending && "opacity-60",
              )}
            >
              {chip.label}
            </button>
          );
        })}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Garçom"
          placeholder="Todos os garçons"
          options={garcomOptions}
          value={currentGarcom}
          onChange={(e) => updateParam({ garcomId: e.target.value })}
          disabled={isPending}
        />
        <Select
          label="Forma de pagamento"
          placeholder="Todas as formas"
          options={formasPagamento.map((f) => ({
            value: f.value,
            label: f.label,
          }))}
          value={currentForma}
          onChange={(e) => updateParam({ formaPagamento: e.target.value })}
          disabled={isPending}
        />
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1.5 block text-sm font-medium text-onyx-200">
            Período
          </label>
          <DateRangePicker
            startDate={currentStart}
            endDate={currentEnd}
            onRangeChange={(start, end) =>
              updateParam({ startDate: start, endDate: end })
            }
          />
        </div>
      </div>
    </div>
  );
}

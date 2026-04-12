"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRangePicker } from "@/components/admin";

interface DateRangeClientProps {
  startDate: string;
  endDate: string;
  /** Parâmetros extras a serem preservados (ex: granularity, categoriaId). */
  extraParams?: Record<string, string | undefined>;
  className?: string;
}

/**
 * Wrapper client do DateRangePicker que atualiza os searchParams via
 * router.push, preservando qualquer parâmetro adicional.
 */
export function DateRangeClient({
  startDate,
  endDate,
  extraParams,
  className,
}: DateRangeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleRangeChange(start: string, end: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("startDate", start);
    params.set("endDate", end);

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value);
        }
      }
    }

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onRangeChange={handleRangeChange}
      className={className}
    />
  );
}

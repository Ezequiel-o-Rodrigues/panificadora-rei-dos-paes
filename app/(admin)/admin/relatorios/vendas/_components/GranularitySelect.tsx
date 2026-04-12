"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/admin";

interface GranularitySelectProps {
  value: string;
}

export function GranularitySelect({ value }: GranularitySelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("granularity", e.target.value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <Select
      name="granularity"
      label="Agrupar por"
      value={value}
      onChange={handleChange}
      options={[
        { value: "dia", label: "Diário" },
        { value: "semana", label: "Semanal" },
        { value: "mes", label: "Mensal" },
      ]}
    />
  );
}

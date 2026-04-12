"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/admin";
import type { CategoriaFiltro } from "../../_queries";

interface CategoriaFilterProps {
  categorias: CategoriaFiltro[];
  value: string;
}

export function CategoriaFilter({
  categorias,
  value,
}: CategoriaFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("categoriaId", e.target.value);
    } else {
      params.delete("categoriaId");
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  return (
    <Select
      name="categoriaId"
      label="Categoria"
      value={value}
      onChange={handleChange}
      placeholder="Todas as categorias"
      options={categorias.map((c) => ({
        value: c.id.toString(),
        label: c.nome,
      }))}
    />
  );
}

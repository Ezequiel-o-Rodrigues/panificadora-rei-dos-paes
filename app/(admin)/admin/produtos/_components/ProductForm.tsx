"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  produtoSchema,
  type ProdutoFormData,
} from "@/lib/validators/produto";
import { Input, Textarea, Select, Button } from "@/components/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const UNIDADE_OPTIONS = [
  { value: "un", label: "Unidade" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "fatia", label: "Fatia" },
  { value: "pacote", label: "Pacote" },
];

interface ProductFormProps {
  categorias: { id: number; nome: string }[];
  defaultValues?: Partial<ProdutoFormData>;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function ProductForm({
  categorias,
  defaultValues,
  action,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema) as unknown as Resolver<ProdutoFormData>,
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      categoriaId: defaultValues?.categoriaId ?? 0,
      descricao: defaultValues?.descricao ?? "",
      preco: defaultValues?.preco ?? "",
      estoqueMinimo: defaultValues?.estoqueMinimo ?? "0",
      unidadeMedida: defaultValues?.unidadeMedida ?? "un",
      pesoGramas: defaultValues?.pesoGramas ?? undefined,
      disponivelHoje: defaultValues?.disponivelHoje ?? true,
      destaque: defaultValues?.destaque ?? false,
      ativo: defaultValues?.ativo ?? true,
    },
  });

  function onSubmit(data: ProdutoFormData) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", data.nome);
      formData.set("categoriaId", String(data.categoriaId));
      formData.set("descricao", data.descricao ?? "");
      formData.set("preco", data.preco);
      formData.set("estoqueMinimo", data.estoqueMinimo ?? "0");
      formData.set("unidadeMedida", data.unidadeMedida);
      formData.set(
        "pesoGramas",
        data.pesoGramas != null ? String(data.pesoGramas) : "",
      );
      formData.set("disponivelHoje", String(data.disponivelHoje));
      formData.set("destaque", String(data.destaque));
      formData.set("ativo", String(data.ativo));

      const result = await action(formData);

      if (result.success) {
        toast.success(
          defaultValues ? "Produto atualizado!" : "Produto criado!",
        );
        router.push("/admin/produtos");
        router.refresh();
      } else {
        toast.error(result.error ?? "Ocorreu um erro.");
      }
    });
  }

  const categoriaOptions = categorias.map((cat) => ({
    value: String(cat.id),
    label: cat.nome,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          label="Nome"
          placeholder="Ex: Pao Frances"
          error={errors.nome?.message}
          {...register("nome")}
        />

        <Select
          label="Categoria"
          placeholder="Selecione uma categoria"
          options={categoriaOptions}
          error={errors.categoriaId?.message}
          {...register("categoriaId")}
        />
      </div>

      <Textarea
        label="Descricao"
        placeholder="Breve descricao do produto (opcional)"
        error={errors.descricao?.message}
        {...register("descricao")}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Input
          label="Preco (R$)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          error={errors.preco?.message}
          {...register("preco")}
        />

        <Input
          label="Estoque Minimo"
          type="number"
          step="0.001"
          min="0"
          placeholder="0"
          error={errors.estoqueMinimo?.message}
          {...register("estoqueMinimo")}
        />

        <Select
          label="Unidade de Medida"
          options={UNIDADE_OPTIONS}
          error={errors.unidadeMedida?.message}
          {...register("unidadeMedida")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Input
          label="Peso (gramas)"
          type="number"
          min="0"
          placeholder="Opcional"
          error={errors.pesoGramas?.message}
          {...register("pesoGramas", { setValueAs: (v) => (v === "" || v === undefined ? undefined : Number(v)) })}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-onyx-800/70 bg-onyx-900/40 p-4">
        <h3 className="text-sm font-semibold text-onyx-200">Configuracoes</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50 accent-flame-500"
            {...register("disponivelHoje")}
          />
          <span className="text-sm text-onyx-200">Disponivel hoje</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50 accent-flame-500"
            {...register("destaque")}
          />
          <span className="text-sm text-onyx-200">Produto em destaque</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50 accent-flame-500"
            {...register("ativo")}
          />
          <span className="text-sm text-onyx-200">Ativo</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {defaultValues ? "Salvar Alteracoes" : "Criar Produto"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/produtos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

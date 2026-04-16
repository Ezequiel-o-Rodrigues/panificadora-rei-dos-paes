"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categoriaSchema,
  type CategoriaFormData,
} from "@/lib/validators/categoria";
import { Input, Textarea, Button, DialogFooter } from "@/components/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface CategoryFormProps {
  defaultValues?: Partial<CategoriaFormData>;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
  submitLabel?: string;
}

export function CategoryForm({
  defaultValues,
  action,
  onSuccess,
  submitLabel = "Salvar",
}: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema) as unknown as Resolver<CategoriaFormData>,
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      descricao: defaultValues?.descricao ?? "",
      icone: defaultValues?.icone ?? "",
      ordem: defaultValues?.ordem ?? 0,
    },
  });

  function onSubmit(data: CategoriaFormData) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", data.nome);
      formData.set("descricao", data.descricao ?? "");
      formData.set("icone", data.icone ?? "");
      formData.set("ordem", String(data.ordem));

      const result = await action(formData);

      if (result.success) {
        toast.success(
          defaultValues ? "Categoria atualizada!" : "Categoria criada!"
        );
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error ?? "Ocorreu um erro.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome"
        placeholder="Ex: Pratos Principais"
        error={errors.nome?.message}
        {...register("nome")}
      />

      <Textarea
        label="Descrição"
        placeholder="Breve descrição da categoria (opcional)"
        error={errors.descricao?.message}
        {...register("descricao")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Ícone (emoji)"
          placeholder="Ex: 🍞"
          error={errors.icone?.message}
          {...register("icone")}
        />

        <Input
          label="Ordem"
          type="number"
          min={0}
          placeholder="0"
          error={errors.ordem?.message}
          {...register("ordem", { valueAsNumber: true })}
        />
      </div>

      <DialogFooter>
        <Button type="submit" loading={isPending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

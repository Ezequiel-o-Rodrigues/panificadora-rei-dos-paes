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
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const UNIDADE_OPTIONS = [
  { value: "un", label: "Unidade" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "fatia", label: "Fatia" },
  { value: "pacote", label: "Pacote" },
  { value: "porcao", label: "Porção" },
  { value: "litro", label: "Litro" },
  { value: "ml", label: "Mililitro" },
  { value: "metro", label: "Metro" },
  { value: "combo", label: "Combo" },
];

interface ProductFormProps {
  categorias: { id: number; nome: string }[];
  defaultValues?: Partial<ProdutoFormData>;
  imagemUrl?: string | null;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function ProductForm({
  categorias,
  defaultValues,
  imagemUrl,
  action,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(imagemUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo: 5MB.");
      e.target.value = "";
      return;
    }

    if (!selected.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem.");
      e.target.value = "";
      return;
    }

    setFile(selected);
    setRemoveExisting(false);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }

  function handleRemoveImage() {
    setFile(null);
    setPreview(null);
    if (imagemUrl) setRemoveExisting(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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

      if (file) {
        formData.set("imagem", file);
      }
      if (removeExisting && !file) {
        formData.set("removerImagem", "true");
      }

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
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Upload de imagem */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-onyx-200">
            Foto do produto
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-onyx-700 bg-onyx-900/40 transition",
              "hover:border-flame-500/60 hover:bg-onyx-800/40",
              preview && "border-solid border-onyx-700",
            )}
          >
            {preview ? (
              <>
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  sizes="280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                  <span className="text-sm font-semibold text-ivory-50">
                    Trocar imagem
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-flame-500/10 text-flame-400">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-ivory-200">
                  Enviar foto
                </div>
                <div className="text-xs text-onyx-400">
                  JPG, PNG ou WEBP
                  <br />
                  Máx 5MB
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
            onChange={handleFileChange}
            className="hidden"
          />
          {preview && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rust-500/40 bg-rust-500/10 px-3 py-2 text-xs font-semibold text-rust-400 transition hover:bg-rust-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover imagem
            </button>
          )}
        </div>

        {/* Campos principais */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Nome"
              placeholder="Ex: Pão Francês"
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
            label="Descrição"
            placeholder="Breve descrição do produto (opcional)"
            error={errors.descricao?.message}
            {...register("descricao")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Input
          label="Preço (R$)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          error={errors.preco?.message}
          {...register("preco")}
        />

        <Input
          label="Estoque Mínimo"
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
          {...register("pesoGramas", {
            setValueAs: (v) =>
              v === "" || v === undefined ? undefined : Number(v),
          })}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-onyx-800/70 bg-onyx-900/40 p-4">
        <h3 className="text-sm font-semibold text-onyx-200">Configurações</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50 accent-flame-500"
            {...register("disponivelHoje")}
          />
          <span className="text-sm text-onyx-200">Disponível hoje</span>
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
          {defaultValues ? "Salvar Alterações" : "Criar Produto"}
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

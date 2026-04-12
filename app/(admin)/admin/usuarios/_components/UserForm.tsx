"use client";

import { useForm } from "react-hook-form";
import { Input, Select, Button, Card } from "@/components/admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type FormValues = {
  nome: string;
  email: string;
  senha: string;
  perfil: "admin" | "usuario";
  ativo: boolean;
};

interface UserFormProps {
  defaultValues?: Partial<Omit<FormValues, "senha">>;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  isEdit?: boolean;
}

export function UserForm({
  defaultValues,
  action,
  isEdit = false,
}: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      email: defaultValues?.email ?? "",
      senha: "",
      perfil: defaultValues?.perfil ?? "usuario",
      ativo: defaultValues?.ativo ?? true,
    },
  });

  function onSubmit(data: FormValues) {
    // Client-side validation
    if (!data.nome || data.nome.trim().length < 2) {
      setError("nome", { message: "Nome deve ter pelo menos 2 caracteres" });
      return;
    }
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError("email", { message: "Email inválido" });
      return;
    }
    if (!isEdit && (!data.senha || data.senha.length < 6)) {
      setError("senha", { message: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }
    if (isEdit && data.senha && data.senha.length < 6) {
      setError("senha", { message: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("nome", data.nome);
      formData.set("email", data.email);
      formData.set("perfil", data.perfil);
      formData.set("ativo", String(data.ativo));
      if (data.senha) {
        formData.set("senha", data.senha);
      }

      const result = await action(formData);

      if (result.success) {
        toast.success(isEdit ? "Usuário atualizado!" : "Usuário criado!");
        router.push("/admin/usuarios");
        router.refresh();
      } else {
        toast.error(result.error ?? "Ocorreu um erro.");
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Nome"
          placeholder="Nome completo"
          error={errors.nome?.message}
          {...register("nome")}
        />

        <Input
          label="E-mail"
          type="email"
          placeholder="email@exemplo.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label={isEdit ? "Nova senha (deixe vazio para manter)" : "Senha"}
          type="password"
          placeholder={isEdit ? "••••••" : "Mínimo 6 caracteres"}
          error={errors.senha?.message}
          {...register("senha")}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Perfil"
            options={[
              { value: "admin", label: "Administrador" },
              { value: "usuario", label: "Operador" },
            ]}
            error={errors.perfil?.message}
            {...register("perfil")}
          />

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-onyx-200">
              Status
            </span>
            <label className="flex items-center gap-3 rounded-xl border border-onyx-700 bg-onyx-800/70 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50"
                {...register("ativo")}
              />
              <span className="text-sm text-ivory-50">Usuário ativo</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={isPending}>
            {isEdit ? "Salvar alterações" : "Criar usuário"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/usuarios")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Input, Button, Card } from "@/components/admin";
import { updateConfig } from "../_actions";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SystemSettingsFormProps {
  configs: Record<string, string>;
}

const fields = [
  { key: "nome_empresa", label: "Nome da empresa", placeholder: "Panificadora Rei dos Pães" },
  { key: "endereco", label: "Endereço", placeholder: "Rua Exemplo, 123 - Cidade/UF" },
  { key: "telefone", label: "Telefone", placeholder: "(11) 1234-5678" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "(11) 91234-5678" },
  { key: "instagram", label: "Instagram", placeholder: "@panificadora" },
  { key: "horario_funcionamento", label: "Horário de funcionamento", placeholder: "Seg-Sáb: 06h-20h | Dom: 06h-13h" },
] as const;

export function SystemSettingsForm({ configs }: SystemSettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.key] = configs[field.key] ?? "";
    }
    return initial;
  });

  const [isPending, startTransition] = useTransition();

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      let hasError = false;

      for (const field of fields) {
        const currentValue = values[field.key] ?? "";
        if (currentValue !== (configs[field.key] ?? "")) {
          const result = await updateConfig(field.key, currentValue);
          if (!result.success) {
            hasError = true;
            toast.error(result.error ?? `Erro ao salvar ${field.label}`);
          }
        }
      }

      if (!hasError) {
        toast.success("Configurações salvas!");
      }
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ivory-50 font-display mb-5">
        Dados da empresa
      </h3>
      <div className="space-y-4">
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            placeholder={field.placeholder}
            value={values[field.key] ?? ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
          />
        ))}

        <div className="pt-2">
          <Button onClick={handleSave} loading={isPending}>
            <Save className="h-4 w-4" />
            Salvar configurações
          </Button>
        </div>
      </div>
    </Card>
  );
}

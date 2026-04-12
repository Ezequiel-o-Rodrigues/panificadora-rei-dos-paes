"use client";

import { useState, useTransition } from "react";
import { Input, Button, Card } from "@/components/admin";
import { updateConfig } from "../_actions";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface TipConfigFormProps {
  configs: Record<string, string>;
}

const tipoOptions = [
  { value: "percentual", label: "Percentual (%)" },
  { value: "fixa", label: "Valor fixo (R$)" },
  { value: "nenhuma", label: "Nenhuma gorjeta" },
] as const;

export function TipConfigForm({ configs }: TipConfigFormProps) {
  const [tipoGorjeta, setTipoGorjeta] = useState(
    configs.tipo_gorjeta ?? "nenhuma"
  );
  const [taxaGorjeta, setTaxaGorjeta] = useState(
    configs.taxa_gorjeta ?? "10"
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      let hasError = false;

      if (tipoGorjeta !== (configs.tipo_gorjeta ?? "")) {
        const result = await updateConfig("tipo_gorjeta", tipoGorjeta);
        if (!result.success) {
          hasError = true;
          toast.error(result.error ?? "Erro ao salvar tipo de gorjeta.");
        }
      }

      if (taxaGorjeta !== (configs.taxa_gorjeta ?? "")) {
        const result = await updateConfig("taxa_gorjeta", taxaGorjeta);
        if (!result.success) {
          hasError = true;
          toast.error(result.error ?? "Erro ao salvar taxa de gorjeta.");
        }
      }

      if (!hasError) {
        toast.success("Configuração de gorjeta salva!");
      }
    });
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-ivory-50 font-display mb-5">
        Configuração de gorjeta
      </h3>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-onyx-200">
            Tipo de gorjeta
          </span>
          <div className="space-y-2">
            {tipoOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 rounded-xl border border-onyx-700 bg-onyx-800/70 px-4 py-3 cursor-pointer transition hover:border-onyx-600"
              >
                <input
                  type="radio"
                  name="tipo_gorjeta"
                  value={option.value}
                  checked={tipoGorjeta === option.value}
                  onChange={(e) => setTipoGorjeta(e.target.value)}
                  className="h-4 w-4 border-onyx-600 bg-onyx-800 text-flame-500 focus:ring-flame-500/50"
                />
                <span className="text-sm text-ivory-50">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {tipoGorjeta !== "nenhuma" && (
          <Input
            label={
              tipoGorjeta === "percentual"
                ? "Taxa de gorjeta (%)"
                : "Valor fixo (R$)"
            }
            type="number"
            min={0}
            step={tipoGorjeta === "percentual" ? "0.5" : "0.01"}
            placeholder={tipoGorjeta === "percentual" ? "10" : "5.00"}
            value={taxaGorjeta}
            onChange={(e) => setTaxaGorjeta(e.target.value)}
          />
        )}

        <div className="pt-2">
          <Button onClick={handleSave} loading={isPending}>
            <Save className="h-4 w-4" />
            Salvar gorjeta
          </Button>
        </div>
      </div>
    </Card>
  );
}

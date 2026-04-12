"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/admin";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

interface ExportCSVButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Se o valor contém ";", aspas ou quebra de linha, envolve em aspas
  // e escapa aspas internas duplicando-as.
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Botão que gera um CSV a partir de `data` e dispara o download.
 * Usa BOM UTF-8 (\ufeff) para compatibilidade com Excel em português.
 * Delimitador é ";" (padrão BR) e quebras de linha são "\r\n".
 */
export function ExportCSVButton<T>({
  data,
  columns,
  filename,
  label = "Exportar CSV",
  disabled,
}: ExportCSVButtonProps<T>) {
  function handleExport() {
    if (data.length === 0) return;

    const header = columns.map((c) => escapeCell(c.header)).join(";");
    const rows = data.map((row) =>
      columns.map((c) => escapeCell(c.accessor(row))).join(";"),
    );
    const csv = "\ufeff" + [header, ...rows].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    link.setAttribute("download", safeName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}

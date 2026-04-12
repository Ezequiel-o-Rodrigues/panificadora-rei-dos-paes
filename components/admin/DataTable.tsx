"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Nenhum registro encontrado",
  className,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm",
        className
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-onyx-800/70">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-onyx-400",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-onyx-800/40">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-onyx-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition hover:bg-onyx-800/40",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-onyx-200",
                      col.className
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

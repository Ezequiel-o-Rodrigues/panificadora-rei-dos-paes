"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  className?: string;
}

const presets = [
  { label: "Hoje", getDates: () => { const d = today(); return [d, d]; } },
  { label: "Ontem", getDates: () => { const d = addDays(today(), -1); return [d, d]; } },
  { label: "7 dias", getDates: () => [addDays(today(), -6), today()] },
  { label: "30 dias", getDates: () => [addDays(today(), -29), today()] },
  { label: "Este mês", getDates: () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), today()]; } },
];

function today() {
  return fmt(new Date());
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return fmt(d);
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  function applyPreset(getDates: () => string[]) {
    const [s, e] = getDates();
    setStart(s);
    setEnd(e);
    onRangeChange(s, e);
  }

  function handleApply() {
    onRangeChange(start, end);
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="ghost"
            size="sm"
            onClick={() => applyPreset(p.getDates)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-onyx-400">De</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-8 rounded-lg border border-onyx-700 bg-onyx-800/70 px-2 text-xs text-ivory-50 focus:outline-none focus:ring-2 focus:ring-flame-500/50"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-onyx-400">Até</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-8 rounded-lg border border-onyx-700 bg-onyx-800/70 px-2 text-xs text-ivory-50 focus:outline-none focus:ring-2 focus:ring-flame-500/50"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleApply}>
          Filtrar
        </Button>
      </div>
    </div>
  );
}

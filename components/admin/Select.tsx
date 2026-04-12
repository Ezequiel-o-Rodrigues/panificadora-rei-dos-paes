"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-onyx-200"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "flex h-10 w-full rounded-xl border border-onyx-700 bg-onyx-800/70 px-3 py-2 text-sm text-ivory-50 transition",
            "focus:outline-none focus:ring-2 focus:ring-flame-500/50 focus:border-flame-500/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rust-500 focus:ring-rust-500/50",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-onyx-900">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-onyx-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rust-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

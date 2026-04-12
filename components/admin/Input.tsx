"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-onyx-200"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-10 w-full rounded-xl border border-onyx-700 bg-onyx-800/70 px-3 py-2 text-sm text-ivory-50 placeholder:text-onyx-400 transition",
            "focus:outline-none focus:ring-2 focus:ring-flame-500/50 focus:border-flame-500/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rust-500 focus:ring-rust-500/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rust-400">{error}</p>}
        {hint && !error && <p className="text-xs text-onyx-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

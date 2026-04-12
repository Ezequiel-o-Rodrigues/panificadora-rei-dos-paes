"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-onyx-200"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full rounded-xl border border-onyx-700 bg-onyx-800/70 px-3 py-2 text-sm text-ivory-50 placeholder:text-onyx-400 transition resize-y",
            "focus:outline-none focus:ring-2 focus:ring-flame-500/50 focus:border-flame-500/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rust-500 focus:ring-rust-500/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rust-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

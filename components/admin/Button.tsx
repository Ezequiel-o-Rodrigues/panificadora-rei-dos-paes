"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-flame-500 to-flame-600 text-white shadow-lg shadow-flame-500/25 hover:from-flame-400 hover:to-flame-500 active:from-flame-600 active:to-flame-700",
        secondary:
          "bg-onyx-800 text-onyx-100 border border-onyx-700 hover:bg-onyx-700 hover:text-ivory-50",
        danger:
          "bg-rust-600 text-white hover:bg-rust-500 active:bg-rust-700",
        ghost:
          "text-onyx-300 hover:bg-onyx-800/60 hover:text-ivory-50",
        outline:
          "border border-onyx-700 text-onyx-200 hover:bg-onyx-800/60 hover:text-ivory-50 hover:border-onyx-600",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { buttonVariants };

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-onyx-800/50 text-onyx-400 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-ivory-50">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-onyx-400">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

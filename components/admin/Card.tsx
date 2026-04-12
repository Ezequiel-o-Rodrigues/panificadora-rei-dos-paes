import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-onyx-800/70 bg-onyx-900/60 backdrop-blur-sm p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-onyx-300">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flame-500/10 text-flame-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-ivory-50 font-display">
        {value}
      </div>
      {(description || trend) && (
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "font-semibold",
                trend.value >= 0 ? "text-emerald-400" : "text-rust-400"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {description && (
            <span className="text-onyx-400">{description}</span>
          )}
        </div>
      )}
    </Card>
  );
}

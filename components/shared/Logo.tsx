import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TENANT_CONFIG } from "@/lib/config/tenant";

type LogoProps = {
  className?: string;
  hideSubtitle?: boolean;
  compact?: boolean;
  size?: number;
};

const LOGO_FILE = path.join(process.cwd(), "public", "images", "logo.png");
const HAS_LOGO_FILE = existsSync(LOGO_FILE);

export function Logo({
  className,
  hideSubtitle,
  compact,
  size = 44,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {HAS_LOGO_FILE ? (
        <Image
          src={TENANT_CONFIG.logoUrl}
          alt={TENANT_CONFIG.nome}
          width={size}
          height={size}
          priority
          className="shrink-0 rounded-full shadow-flame ring-1 ring-flame-500/40"
        />
      ) : (
        <LogoFallback size={size} />
      )}
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-bold uppercase tracking-wide text-ivory-50">
            {TENANT_CONFIG.nome}
          </span>
          {!hideSubtitle && (
            <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-onyx-300">
              {TENANT_CONFIG.subtitulo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function LogoFallback({ size }: { size: number }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full bg-onyx-950 ring-1 ring-flame-500/50 shadow-flame"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 48"
        style={{ width: size * 0.7, height: size * 0.7 }}
        aria-hidden
      >
        <defs>
          <linearGradient id="logo-crown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa855" />
            <stop offset="55%" stopColor="#ff6d0a" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path d="M24 6 C22 10 22 12 24 14 C26 12 26 10 24 6 Z" fill="#ffa855" />
        <path
          d="M7 32 L10 17 L17 23 L24 13 L31 23 L38 17 L41 32 Z"
          fill="url(#logo-crown)"
          stroke="#ff8c28"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <rect
          x="7"
          y="31"
          width="34"
          height="5"
          rx="1.2"
          fill="url(#logo-crown)"
          stroke="#ff8c28"
          strokeWidth="0.6"
        />
        <circle cx="17" cy="22" r="1.2" fill="#fafaf5" opacity="0.9" />
        <circle cx="24" cy="13" r="1.3" fill="#fafaf5" opacity="0.9" />
        <circle cx="31" cy="22" r="1.2" fill="#fafaf5" opacity="0.9" />
      </svg>
    </div>
  );
}

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: "none" | "lg" | "xl" | "2xl" | "full";
}

const roundedMap = {
  none: "",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

/**
 * Componente de imagem de produto com fallback visual elegante.
 * Usa next/image quando há src, senão mostra ícone decorativo.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  rounded = "xl",
}: ProductImageProps) {
  const roundedClass = roundedMap[rounded];

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-onyx-800 via-onyx-850 to-onyx-900",
          roundedClass,
          className
        )}
      >
        <ImageIcon className="h-1/3 w-1/3 text-onyx-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-onyx-900", roundedClass, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}

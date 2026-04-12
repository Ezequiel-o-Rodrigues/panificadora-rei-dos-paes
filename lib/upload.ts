import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "produtos");
const PUBLIC_PREFIX = "/uploads/produtos";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  filename: string;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    default:
      return ".bin";
  }
}

/**
 * Salva uma imagem de produto em public/uploads/produtos/ e retorna a URL pública.
 * Retorna null se o file for vazio/ausente.
 * Lança Error em caso de tipo inválido ou tamanho excedido.
 */
export async function saveProductImage(
  file: File | null | undefined
): Promise<UploadResult | null> {
  if (!file || file.size === 0) return null;

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(
      "Formato de imagem não suportado. Use JPG, PNG, WEBP ou AVIF."
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Imagem muito grande. Tamanho máximo: 5MB.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = extFromMime(file.type);
  const random = randomBytes(8).toString("hex");
  const filename = `${Date.now()}-${random}${ext}`;
  const absPath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return {
    url: `${PUBLIC_PREFIX}/${filename}`,
    filename,
  };
}

/**
 * Remove arquivo de imagem do disco se a URL for de upload local.
 * Silencioso em caso de erro (o arquivo pode já ter sido removido).
 */
export async function deleteProductImage(url: string | null | undefined) {
  if (!url || !url.startsWith(PUBLIC_PREFIX)) return;
  const filename = url.slice(PUBLIC_PREFIX.length + 1);
  if (!filename || filename.includes("/") || filename.includes("..")) return;
  const absPath = path.join(UPLOAD_DIR, filename);
  try {
    await unlink(absPath);
  } catch {
    // ignore — arquivo pode não existir
  }
}

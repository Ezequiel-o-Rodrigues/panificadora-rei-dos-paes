import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { del, put } from "@vercel/blob";

const LOCAL_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "produtos"
);
const LOCAL_PUBLIC_PREFIX = "/uploads/produtos";
const BLOB_PATH_PREFIX = "produtos";

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

function shouldUseBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Salva uma imagem de produto.
 * - Em produção (Vercel): usa Vercel Blob (requer BLOB_READ_WRITE_TOKEN).
 * - Em dev sem token: grava em public/uploads/produtos/ localmente.
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

  const ext = extFromMime(file.type);
  const random = randomBytes(8).toString("hex");
  const filename = `${Date.now()}-${random}${ext}`;

  if (shouldUseBlob()) {
    const blob = await put(`${BLOB_PATH_PREFIX}/${filename}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url, filename };
  }

  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const absPath = path.join(LOCAL_UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return {
    url: `${LOCAL_PUBLIC_PREFIX}/${filename}`,
    filename,
  };
}

/**
 * Remove imagem de produto.
 * Detecta automaticamente se a URL é Vercel Blob ou upload local.
 * Silencioso em caso de erro (arquivo pode já ter sido removido).
 */
export async function deleteProductImage(url: string | null | undefined) {
  if (!url) return;

  if (url.includes(".blob.vercel-storage.com")) {
    try {
      await del(url);
    } catch {
      // ignore — arquivo pode não existir
    }
    return;
  }

  if (!url.startsWith(LOCAL_PUBLIC_PREFIX)) return;
  const filename = url.slice(LOCAL_PUBLIC_PREFIX.length + 1);
  if (!filename || filename.includes("/") || filename.includes("..")) return;
  const absPath = path.join(LOCAL_UPLOAD_DIR, filename);
  try {
    await unlink(absPath);
  } catch {
    // ignore
  }
}

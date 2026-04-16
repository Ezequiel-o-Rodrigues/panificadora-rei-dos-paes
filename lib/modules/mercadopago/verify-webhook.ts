import { createHmac, timingSafeEqual } from "node:crypto";

type VerifyParams = {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
  secret: string;
};

export function verifyMercadoPagoWebhook({
  signatureHeader,
  requestIdHeader,
  dataId,
  secret,
}: VerifyParams): boolean {
  if (!signatureHeader || !requestIdHeader || !dataId) return false;

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const tsMatch = parts.find((p) => p.startsWith("ts="));
  const v1Match = parts.find((p) => p.startsWith("v1="));
  if (!tsMatch || !v1Match) return false;

  const ts = tsMatch.slice(3);
  const v1 = v1Match.slice(3);

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const hmac = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

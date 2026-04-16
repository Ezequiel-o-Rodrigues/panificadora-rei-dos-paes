import QRCode from "qrcode";
import { getFeatureConfig } from "@/lib/features";

export function buildCardapioMesaUrl(
  mesa: number | string,
  urlBase?: string,
): string {
  const base =
    urlBase ??
    getFeatureConfig("cardapio_qr_mesa")?.urlBase ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "";
  const trimmed = base.replace(/\/$/, "");
  return `${trimmed}/cardapio?mesa=${encodeURIComponent(String(mesa))}`;
}

export async function generateMesaQrCodeDataUrl(
  mesa: number | string,
  urlBase?: string,
): Promise<string> {
  const url = buildCardapioMesaUrl(mesa, urlBase);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: {
      dark: "#050403",
      light: "#ffffff",
    },
  });
}

export async function generateMesaQrCodesDataUrls(
  mesas: (number | string)[],
  urlBase?: string,
): Promise<{ mesa: number | string; dataUrl: string; url: string }[]> {
  return Promise.all(
    mesas.map(async (mesa) => ({
      mesa,
      dataUrl: await generateMesaQrCodeDataUrl(mesa, urlBase),
      url: buildCardapioMesaUrl(mesa, urlBase),
    })),
  );
}

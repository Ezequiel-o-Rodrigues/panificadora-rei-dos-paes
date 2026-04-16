export type FeatureKey =
  | "mercadopago_pix"
  | "whatsapp_orders"
  | "cardapio_qr_mesa"
  | "impressao_cozinha";

export type MercadoPagoConfig = {
  accessToken: string;
  publicKey?: string;
  webhookSecret?: string;
};

export type WhatsAppConfig = {
  numero: string;
  mensagemPadrao?: string;
};

export type CardapioQrMesaConfig = {
  urlBase?: string;
};

export type ImpressaoCozinhaConfig = {
  impressoraUrl?: string;
};

export type FeatureConfigMap = {
  mercadopago_pix: MercadoPagoConfig;
  whatsapp_orders: WhatsAppConfig;
  cardapio_qr_mesa: CardapioQrMesaConfig;
  impressao_cozinha: ImpressaoCozinhaConfig;
};

const PUBLIC_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  mercadopago_pix:
    process.env.NEXT_PUBLIC_FEATURE_MERCADOPAGO_PIX === "true",
  whatsapp_orders:
    process.env.NEXT_PUBLIC_FEATURE_WHATSAPP_ORDERS === "true",
  cardapio_qr_mesa:
    process.env.NEXT_PUBLIC_FEATURE_CARDAPIO_QR_MESA === "true",
  impressao_cozinha:
    process.env.NEXT_PUBLIC_FEATURE_IMPRESSAO_COZINHA === "true",
};

export function isFeatureEnabled(key: FeatureKey): boolean {
  return PUBLIC_FEATURE_FLAGS[key] ?? false;
}

export function getFeatureConfig<K extends FeatureKey>(
  key: K
): FeatureConfigMap[K] | null {
  if (!isFeatureEnabled(key)) return null;

  switch (key) {
    case "mercadopago_pix": {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) return null;
      const config: MercadoPagoConfig = {
        accessToken,
        publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
        webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
      };
      return config as FeatureConfigMap[K];
    }
    case "whatsapp_orders": {
      const numero = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO;
      if (!numero) return null;
      const config: WhatsAppConfig = {
        numero,
        mensagemPadrao: process.env.NEXT_PUBLIC_WHATSAPP_MENSAGEM_PADRAO,
      };
      return config as FeatureConfigMap[K];
    }
    case "cardapio_qr_mesa": {
      const config: CardapioQrMesaConfig = {
        urlBase: process.env.NEXT_PUBLIC_CARDAPIO_QR_URL_BASE,
      };
      return config as FeatureConfigMap[K];
    }
    case "impressao_cozinha": {
      const config: ImpressaoCozinhaConfig = {
        impressoraUrl: process.env.IMPRESSORA_COZINHA_URL,
      };
      return config as FeatureConfigMap[K];
    }
  }

  return null;
}

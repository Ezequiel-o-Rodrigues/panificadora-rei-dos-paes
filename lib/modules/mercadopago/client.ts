const MP_API_BASE = "https://api.mercadopago.com";

export type MpPaymentResponse = {
  id: number;
  status:
    | "pending"
    | "approved"
    | "authorized"
    | "in_process"
    | "in_mediation"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  status_detail: string;
  date_of_expiration?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  transaction_amount: number;
};

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

async function mpFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new MercadoPagoError(
      `Mercado Pago API error ${res.status}`,
      res.status,
      body,
    );
  }

  return (await res.json()) as T;
}

export function createMpClient(accessToken: string) {
  return {
    async createPixPayment(params: {
      valor: number;
      descricao: string;
      externalReference: string;
      notificationUrl?: string;
      expiracaoMinutos?: number;
      payerEmail?: string;
      idempotencyKey: string;
    }): Promise<MpPaymentResponse> {
      const dateOfExpiration = new Date(
        Date.now() + (params.expiracaoMinutos ?? 15) * 60_000,
      ).toISOString();

      const body = {
        transaction_amount: Number(params.valor.toFixed(2)),
        description: params.descricao,
        payment_method_id: "pix",
        external_reference: params.externalReference,
        date_of_expiration: dateOfExpiration,
        notification_url: params.notificationUrl,
        payer: {
          email: params.payerEmail ?? "cliente@local.pdv",
        },
      };

      return mpFetch<MpPaymentResponse>(accessToken, "/v1/payments", {
        method: "POST",
        headers: {
          "X-Idempotency-Key": params.idempotencyKey,
        },
        body: JSON.stringify(body),
      });
    },

    async getPayment(paymentId: string): Promise<MpPaymentResponse> {
      return mpFetch<MpPaymentResponse>(
        accessToken,
        `/v1/payments/${paymentId}`,
        { method: "GET" },
      );
    },
  };
}

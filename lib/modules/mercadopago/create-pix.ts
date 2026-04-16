import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { comandas, itensComanda, itensLivres, pagamentosPix } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calcTotalComanda, toMoney } from "@/lib/calculations";
import { TENANT_CONFIG } from "@/lib/config/tenant";
import { getFeatureConfig } from "@/lib/features";
import { createMpClient } from "./client";

export type CriarPagamentoPixResult =
  | {
      success: true;
      data: {
        pagamentoId: number;
        mpPaymentId: string;
        qrCode: string;
        qrCodeBase64: string;
        valor: number;
        expiresAt: Date;
      };
    }
  | { success: false; error: string };

export async function criarPagamentoPixParaComanda(
  comandaId: number,
  taxaGorjetaInput: number,
): Promise<CriarPagamentoPixResult> {
  const cfg = getFeatureConfig("mercadopago_pix");
  if (!cfg?.accessToken) {
    return {
      success: false,
      error: "Integração Mercado Pago não configurada.",
    };
  }

  const comanda = await db.query.comandas.findFirst({
    where: eq(comandas.id, comandaId),
  });
  if (!comanda) return { success: false, error: "Comanda não encontrada." };
  if (comanda.status !== "aberta") {
    return { success: false, error: "Comanda não está aberta." };
  }

  const [itens, livres] = await Promise.all([
    db.query.itensComanda.findMany({
      where: eq(itensComanda.comandaId, comandaId),
    }),
    db.query.itensLivres.findMany({
      where: eq(itensLivres.comandaId, comandaId),
    }),
  ]);

  if (itens.length === 0 && livres.length === 0) {
    return { success: false, error: "Comanda vazia." };
  }

  const subtotal = [
    ...itens.map((i) => Number(i.subtotal)),
    ...livres.map((i) => Number(i.subtotal)),
  ].reduce((acc, n) => acc + n, 0);

  const gorjetaValor =
    taxaGorjetaInput > 0 && taxaGorjetaInput <= 100
      ? subtotal * (taxaGorjetaInput / 100)
      : Math.max(0, taxaGorjetaInput);
  const total = Number(calcTotalComanda(subtotal, gorjetaValor));

  if (total <= 0) {
    return { success: false, error: "Valor do pagamento inválido." };
  }

  const externalReference = `comanda-${comandaId}-${Date.now()}`;
  const idempotencyKey = randomUUID();
  const notificationUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`
      : undefined;

  const mp = createMpClient(cfg.accessToken);

  let payment;
  try {
    payment = await mp.createPixPayment({
      valor: total,
      descricao: `${TENANT_CONFIG.nome} - Comanda #${comanda.numero}`,
      externalReference,
      notificationUrl,
      expiracaoMinutos: 15,
      idempotencyKey,
    });
  } catch (error) {
    console.error("[MP Pix] erro ao criar pagamento:", error);
    return {
      success: false,
      error: "Não foi possível gerar o QR Code Pix. Tente novamente.",
    };
  }

  const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
  const qrCodeBase64 =
    payment.point_of_interaction?.transaction_data?.qr_code_base64;
  if (!qrCode || !qrCodeBase64) {
    return {
      success: false,
      error: "Mercado Pago não retornou o QR Code. Tente novamente.",
    };
  }

  const expiresAt = payment.date_of_expiration
    ? new Date(payment.date_of_expiration)
    : new Date(Date.now() + 15 * 60_000);

  const [row] = await db
    .insert(pagamentosPix)
    .values({
      comandaId,
      mpPaymentId: String(payment.id),
      qrCode,
      qrCodeBase64,
      valor: toMoney(total),
      taxaGorjetaSnapshot: toMoney(gorjetaValor),
      status: "pending",
      expiresAt,
    })
    .returning({ id: pagamentosPix.id });

  return {
    success: true,
    data: {
      pagamentoId: row.id,
      mpPaymentId: String(payment.id),
      qrCode,
      qrCodeBase64,
      valor: total,
      expiresAt,
    },
  };
}

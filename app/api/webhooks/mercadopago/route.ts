import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comandas, pagamentosPix } from "@/db/schema";
import { createMpClient } from "@/lib/modules/mercadopago/client";
import { verifyMercadoPagoWebhook } from "@/lib/modules/mercadopago/verify-webhook";
import { finalizarComandaCore } from "@/lib/modules/comandas/finalizar-core";
import { getFeatureConfig } from "@/lib/features";

type MpWebhookPayload = {
  action?: string;
  type?: string;
  data?: { id?: string };
};

export async function POST(req: Request) {
  const cfg = getFeatureConfig("mercadopago_pix");
  if (!cfg?.accessToken) {
    return NextResponse.json(
      { error: "Mercado Pago not configured" },
      { status: 503 },
    );
  }

  let payload: MpWebhookPayload;
  try {
    payload = (await req.json()) as MpWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataId = payload?.data?.id ? String(payload.data.id) : null;
  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  if (cfg.webhookSecret) {
    const signatureHeader = req.headers.get("x-signature");
    const requestIdHeader = req.headers.get("x-request-id");
    const valid = verifyMercadoPagoWebhook({
      signatureHeader,
      requestIdHeader,
      dataId,
      secret: cfg.webhookSecret,
    });
    if (!valid) {
      console.warn("[MP webhook] assinatura inválida");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if (payload.type && payload.type !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const pagamento = await db.query.pagamentosPix.findFirst({
    where: eq(pagamentosPix.mpPaymentId, dataId),
  });
  if (!pagamento) {
    return NextResponse.json({ ok: true });
  }

  let mpStatus;
  try {
    const mp = createMpClient(cfg.accessToken);
    mpStatus = await mp.getPayment(dataId);
  } catch (err) {
    console.error("[MP webhook] erro ao consultar pagamento:", err);
    return NextResponse.json({ error: "MP lookup failed" }, { status: 502 });
  }

  if (mpStatus.status === "approved" && pagamento.status !== "approved") {
    await db
      .update(pagamentosPix)
      .set({ status: "approved", paidAt: new Date() })
      .where(eq(pagamentosPix.id, pagamento.id));

    const comanda = await db.query.comandas.findFirst({
      where: eq(comandas.id, pagamento.comandaId),
      columns: { status: true, usuarioAberturaId: true },
    });

    if (comanda?.status === "aberta") {
      // Usa o snapshot de gorjeta como valor fixo (já calculado no momento
      // em que o QR foi gerado) para garantir que o total seja idêntico
      // ao que o cliente pagou.
      await finalizarComandaCore({
        comandaId: pagamento.comandaId,
        userId: comanda.usuarioAberturaId,
        formaPagamento: "pix",
        taxaGorjetaInput: pagamento.taxaGorjetaSnapshot,
        gorjetaConfig: {
          tipo: "fixa",
          taxa: pagamento.taxaGorjetaSnapshot,
        },
      });
    }
  } else if (
    (mpStatus.status === "cancelled" || mpStatus.status === "rejected") &&
    pagamento.status === "pending"
  ) {
    await db
      .update(pagamentosPix)
      .set({ status: mpStatus.status })
      .where(eq(pagamentosPix.id, pagamento.id));
  }

  return NextResponse.json({ ok: true });
}

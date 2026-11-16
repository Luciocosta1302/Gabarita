import { NextResponse } from "next/server";

import { applyPaymentStatus } from "@/lib/billing/service";
import { getPayment, mapStatus, paymentsConfigured, verifyWebhookSignature } from "@/lib/billing/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook do Mercado Pago. Não confia no corpo: valida a assinatura e consulta o pagamento na API do MP
 * antes de liberar o Pro. Sempre responde 200 rápido para eventos que não são de pagamento.
 */
export async function POST(req: Request) {
  if (!paymentsConfigured()) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "MERCADOPAGO_WEBHOOK_SECRET não configurado." }, { status: 503 });
  const ok = verifyWebhookSignature({ signature: req.headers.get("x-signature"), requestId: req.headers.get("x-request-id"), dataId, secret });
  if (!ok) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  const payment = await getPayment(dataId);
  if (!payment.external_reference) return NextResponse.json({ ok: true, ignored: true });
  const result = await applyPaymentStatus(createAdminClient(), payment.external_reference, mapStatus(payment.status), payment.id);
  return NextResponse.json({ ok: true, ...result });
}

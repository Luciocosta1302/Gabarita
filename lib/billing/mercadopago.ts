import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PRO_PERIOD_DAYS, PRO_PRICE_CENTS } from "./plan";

/**
 * Mercado Pago (Checkout Pro): Pix e cartão. Pagamento avulso de 30 dias de Pro — a assinatura
 * recorrente do MP não aceita Pix, e Pix é o que o público usa.
 */
const API = "https://api.mercadopago.com";

function token() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

export function paymentsConfigured() {
  return !!token();
}

/** Simulação só fora de produção e sem chave do MP (para dev e testes). */
export function simulationAllowed() {
  return !paymentsConfigured() && process.env.NODE_ENV !== "production";
}

export async function createCheckout(input: { paymentId: string; baseUrl: string }) {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.paymentId,
    },
    body: JSON.stringify({
      items: [
        {
          id: `pro-${PRO_PERIOD_DAYS}d`,
          title: `Gabarita Pro — ${PRO_PERIOD_DAYS} dias`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: PRO_PRICE_CENTS / 100,
        },
      ],
      external_reference: input.paymentId,
      notification_url: `${input.baseUrl}/api/payments/webhook`,
      back_urls: {
        success: `${input.baseUrl}/planos?status=aprovado`,
        pending: `${input.baseUrl}/planos?status=pendente`,
        failure: `${input.baseUrl}/planos?status=falhou`,
      },
      auto_return: "approved",
      // Pix (bank_transfer) e cartão; boleto fica de fora (demora dias para compensar)
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
      statement_descriptor: "GABARITA",
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { id: string; init_point: string };
  return { preferenceId: json.id, url: json.init_point };
}

export type MpPayment = { id: string; status: string; external_reference: string | null; transaction_amount: number };

export async function getPayment(id: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao consultar o pagamento`);
  const p = (await res.json()) as { id: number | string; status: string; external_reference: string | null; transaction_amount: number };
  return { id: String(p.id), status: p.status, external_reference: p.external_reference, transaction_amount: p.transaction_amount };
}

/**
 * Valida a assinatura do webhook (header x-signature "ts=...,v1=..."): HMAC-SHA256 do texto
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com o segredo do webhook.
 */
export function verifyWebhookSignature(input: { signature: string | null; requestId: string | null; dataId: string; secret: string }) {
  if (!input.signature) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((kv) => kv.trim().split("=", 2) as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId;
  const manifest = `id:${id};${input.requestId ? `request-id:${input.requestId};` : ""}ts:${parts.ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Status do MP → status do nosso registro. */
export function mapStatus(mp: string): "pending" | "approved" | "rejected" | "cancelled" | "refunded" {
  if (mp === "approved") return "approved";
  if (mp === "rejected") return "rejected";
  if (mp === "cancelled") return "cancelled";
  if (mp === "refunded" || mp === "charged_back") return "refunded";
  return "pending";
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { createCheckout, paymentsConfigured, simulationAllowed } from "@/lib/billing/mercadopago";
import { PRO_PERIOD_DAYS, PRO_PRICE_CENTS } from "@/lib/billing/plan";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cria o pagamento do Pro e devolve o link do checkout do Mercado Pago (Pix ou cartão). */
export const POST = apiRoute(z.object({}).passthrough(), async (_input, { user }) => {
  if (!paymentsConfigured() && !simulationAllowed()) return jsonError("Pagamentos ainda não estão configurados.", 503);
  // o Mercado Pago precisa de um endereço público para o webhook e para voltar ao app
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (paymentsConfigured() && !appUrl) return jsonError("APP_URL não configurada.", 503);
  const admin = createAdminClient();
  const { data: pay, error } = await admin
    .from("payments")
    .insert({ user_id: user.id, amount_cents: PRO_PRICE_CENTS, period_days: PRO_PERIOD_DAYS, provider: paymentsConfigured() ? "mercadopago" : "simulado" })
    .select("id")
    .single();
  if (error || !pay) throw error ?? new Error("Falha ao criar o pagamento");

  let url: string;
  if (paymentsConfigured()) {
    const checkout = await createCheckout({ paymentId: pay.id, baseUrl: appUrl! });
    url = checkout.url;
  } else {
    url = `/planos/simular?pagamento=${pay.id}`;
  }
  await admin.from("payments").update({ checkout_url: url }).eq("id", pay.id);
  return NextResponse.json({ url, payment_id: pay.id }, { status: 201 });
});

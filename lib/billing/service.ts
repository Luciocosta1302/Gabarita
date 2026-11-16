import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";

import { extendPro } from "./plan";

/**
 * Aplica o resultado de um pagamento (idempotente): aprovado → soma 30 dias de Pro.
 * Chamado pelo webhook do Mercado Pago (ou pela simulação em dev).
 */
export async function applyPaymentStatus(
  admin: AdminClient,
  paymentId: string,
  status: "pending" | "approved" | "rejected" | "cancelled" | "refunded",
  providerPaymentId: string | null,
) {
  const { data: pay } = await admin.from("payments").select("id, user_id, status, period_days").eq("id", paymentId).maybeSingle();
  if (!pay) return { applied: false, reason: "pagamento desconhecido" };
  if (pay.status === "approved" && status === "approved") return { applied: false, reason: "já aplicado" };

  if (status !== "approved") {
    const { error } = await admin.from("payments").update({ status, provider_payment_id: providerPaymentId ?? undefined }).eq("id", paymentId);
    if (error) throw error;
    return { applied: false, reason: status };
  }

  // marca como aprovado só se ainda não estava (evita somar 30 dias duas vezes em webhooks repetidos)
  const { data: claimed, error: claimError } = await admin
    .from("payments")
    .update({ status: "approved", paid_at: new Date().toISOString(), provider_payment_id: providerPaymentId ?? undefined })
    .eq("id", paymentId)
    .neq("status", "approved")
    .select("id");
  if (claimError) throw claimError; // erro de banco não pode virar "já aplicado" (o Pro não seria liberado)
  if (!claimed?.length) return { applied: false, reason: "já aplicado" };

  const { data: profile } = await admin.from("profiles").select("pro_until").eq("id", pay.user_id).single();
  const until = extendPro(profile?.pro_until ?? null, new Date(), pay.period_days);
  const { error: proError } = await admin.from("profiles").update({ plan: "pro", pro_until: until }).eq("id", pay.user_id);
  if (proError) throw proError;
  return { applied: true, proUntil: until };
}

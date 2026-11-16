import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { simulationAllowed } from "@/lib/billing/mercadopago";
import { applyPaymentStatus } from "@/lib/billing/service";
import { createAdminClient } from "@/lib/supabase/admin";

/** SÓ EM DESENVOLVIMENTO (sem chave do Mercado Pago): simula o pagamento aprovado para testar o fluxo. */
export const POST = apiRoute(z.object({ payment_id: z.uuid() }), async ({ payment_id }, { supabase }) => {
  if (!simulationAllowed()) return jsonError("Simulação desligada.", 403);
  const { data: pay } = await supabase.from("payments").select("id").eq("id", payment_id).maybeSingle();
  if (!pay) return jsonError("Pagamento não encontrado.", 404);
  const r = await applyPaymentStatus(createAdminClient(), payment_id, "approved", `simulado-${payment_id.slice(0, 8)}`);
  return NextResponse.json(r);
});

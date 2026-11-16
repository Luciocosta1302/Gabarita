import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { assertPro } from "@/lib/billing/limits";
import { normalizePhone } from "@/lib/whatsapp/format";
import { whatsappSettingsSchema } from "@/lib/validation/generate";

/** Número, ativar/desativar e horário das 5 questões diárias (ativar é do Pro). */
export const POST = apiRoute(whatsappSettingsSchema, async (input, { supabase, user }) => {
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (input.phone && !phone) return jsonError("Número inválido. Use DDD + número, ex.: (11) 98765-4321.", 400);
  if (input.opt_in) {
    await assertPro(supabase, user.id, "whatsapp");
    if (!phone) return jsonError("Informe o número do WhatsApp.", 400);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ whatsapp_phone: phone, whatsapp_opt_in: input.opt_in, whatsapp_hour: input.hour })
    .eq("id", user.id);
  if (error?.code === "23505") return jsonError("Esse número já está em uso por outra conta.", 409);
  if (error) throw error;
  return NextResponse.json({ ok: true, phone });
});

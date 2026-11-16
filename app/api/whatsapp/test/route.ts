import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { assertPro } from "@/lib/billing/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { startDailySession } from "@/lib/whatsapp/service";

/** Manda as questões de hoje agora (sem esperar o horário). */
export const POST = apiRoute(z.object({}).passthrough(), async (_input, { supabase, user }) => {
  await assertPro(supabase, user.id, "whatsapp");
  const id = await startDailySession(createAdminClient(), user.id, { force: true });
  if (!id) return jsonError("Sem número cadastrado ou sem questões ainda. Gere algumas questões primeiro.", 400);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { simuladoStartSchema } from "@/lib/validation/generate";

/** D16 — começa o cronômetro (só na primeira vez; recarregar a página não zera o tempo). */
export const POST = apiRoute(simuladoStartSchema, async ({ quiz_id }, { supabase }) => {
  const { data: quiz } = await supabase.from("quizzes").select("mode, started_at, time_limit_s").eq("id", quiz_id).maybeSingle();
  if (!quiz || quiz.mode !== "simulado") return jsonError("Simulado não encontrado.", 404);
  let startedAt = quiz.started_at;
  if (!startedAt) {
    startedAt = new Date().toISOString();
    const { error } = await supabase.from("quizzes").update({ started_at: startedAt }).eq("id", quiz_id).is("started_at", null);
    if (error) throw error;
  }
  return NextResponse.json({ started_at: startedAt, time_limit_s: quiz.time_limit_s });
});

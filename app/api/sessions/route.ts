import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { focusStats } from "@/lib/focus/stats";
import { sessionSchema } from "@/lib/validation/generate";

/** Registra um bloco de foco do Pomodoro (Espaço de estudos) e devolve as estatísticas novas. */
export const POST = apiRoute(sessionSchema, async (input, { supabase, user }) => {
  const before = await focusStats(supabase);
  const { error } = await supabase.from("study_sessions").insert({
    user_id: user.id,
    subject_id: input.subject_id ?? null,
    focus_minutes: input.focus_minutes,
    goals_json: input.goals,
    scene: input.scene ?? null,
  });
  if (error) throw error;
  const after = await focusStats(supabase);
  return NextResponse.json({ before: before.totalMinutes, ...after }, { status: 201 });
});

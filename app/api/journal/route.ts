import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { reflectWeek } from "@/lib/journal/service";
import { journalActionSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** Diário de aprendizagem: novo registro ou acompanhamento da semana (IA). */
export const POST = apiRoute(journalActionSchema, async (input, { supabase, user }) => {
  if (input.action === "reflect") return NextResponse.json(await reflectWeek(supabase, user.id), { status: 201 });
  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    subject_id: input.subject_id ?? null,
    learned: input.learned,
    difficulties: input.difficulties ?? null,
    mood: input.mood,
    focus_minutes: input.focus_minutes ?? null,
  });
  if (error) throw error;
  return NextResponse.json({ ok: true }, { status: 201 });
});

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import { journalPrompt } from "@/lib/ai/prompts/journal";
import { addDays, todayBR } from "@/lib/dates";
import { UserFacingError } from "@/lib/errors";
import { focusStats } from "@/lib/focus/stats";
import type { Database, Json } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;
export const REFLECTION_DAYS = 7;

/** Acompanhamento da semana: a IA lê os registros dos últimos 7 dias + os números e devolve a evolução. */
export async function reflectWeek(db: DB, userId: string) {
  const end = todayBR();
  const start = addDays(end, -(REFLECTION_DAYS - 1));
  const since = `${start}T00:00:00-03:00`;
  const [{ data: entries }, { data: attempts }, focus] = await Promise.all([
    db.from("journal_entries").select("created_at, mood, learned, difficulties, focus_minutes, subjects(name)").gte("created_at", since).order("created_at"),
    db.from("attempts").select("correct").gte("created_at", since).limit(10000),
    focusStats(db, end),
  ]);
  if (!entries || entries.length < 2) throw new UserFacingError("Faça pelo menos 2 registros na semana para gerar o acompanhamento.");
  const { data: sessions } = await db.from("study_sessions").select("focus_minutes").gte("ended_at", since);
  const answered = attempts?.length ?? 0;
  const { data } = await generateJSON(
    journalPrompt({
      entries: entries.map((e) => ({
        date: todayBR(new Date(e.created_at)),
        mood: e.mood,
        learned: e.learned,
        difficulties: e.difficulties,
        subject: e.subjects?.name ?? null,
        focusMinutes: e.focus_minutes,
      })),
      stats: {
        answered,
        accuracy: answered ? attempts!.filter((a) => a.correct).length / answered : null,
        focusMinutes: (sessions ?? []).reduce((s, x) => s + x.focus_minutes, 0),
        streak: focus.streak,
      },
    }),
  );
  const { data: saved, error } = await db
    .from("journal_reflections")
    .insert({ user_id: userId, period_start: start, period_end: end, content_json: data as unknown as NonNullable<Json> })
    .select("id")
    .single();
  if (error || !saved) throw error ?? new Error("Falha ao salvar o acompanhamento");
  return data;
}

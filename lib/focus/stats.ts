import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayBR } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

import { streakDays } from "./scenes";

/** Minutos de foco (total e hoje) e dias seguidos de estudo do usuário. */
export async function focusStats(db: SupabaseClient<Database>, today = todayBR()) {
  const { data } = await db.from("study_sessions").select("focus_minutes, ended_at").order("ended_at", { ascending: false }).limit(5000);
  const sessions = data ?? [];
  const dates = sessions.map((s) => todayBR(new Date(s.ended_at)));
  return {
    totalMinutes: sessions.reduce((s, x) => s + x.focus_minutes, 0),
    todayMinutes: sessions.filter((_, i) => dates[i] === today).reduce((s, x) => s + x.focus_minutes, 0),
    sessionsToday: dates.filter((d) => d === today).length,
    streak: streakDays(dates, today),
  };
}

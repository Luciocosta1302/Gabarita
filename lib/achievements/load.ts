import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { focusStats } from "@/lib/focus/stats";
import type { Database } from "@/lib/supabase/database.types";

import { createAdminClient } from "@/lib/supabase/admin";

import { type AchievementCounts, evaluate, xpOf } from "./badges";

type DB = SupabaseClient<Database>;

/** Números do aluno usados pelas conquistas (RLS: só os dele). */
export async function loadAchievementCounts(supabase: DB): Promise<AchievementCounts> {
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const mine = user?.id ?? "00000000-0000-0000-0000-000000000000";
  const [answered, correct, focus, materials, errorsResolved, simulados, stepsDone, feynman, journal, rooms, flashcardReviews, posts, comments] = await Promise.all([
    count(supabase.from("attempts").select("id", head)),
    count(supabase.from("attempts").select("id", head).eq("correct", true)),
    focusStats(supabase),
    count(supabase.from("materials").select("id", head).neq("type", "past_exam")),
    count(supabase.from("error_notebook").select("id", head).not("resolved_at", "is", null)),
    count(supabase.from("quizzes").select("id", head).eq("mode", "simulado").not("finished_at", "is", null)),
    count(supabase.from("path_steps").select("id", head).eq("status", "done")),
    count(supabase.from("feynman_sessions").select("id", head)),
    count(supabase.from("journal_entries").select("id", head)),
    count(supabase.from("room_members").select("room_id", head)),
    count(supabase.from("reviews").select("id", head).not("last_reviewed_at", "is", null)),
    // comunidade é pública: conta só o que é do aluno
    count(supabase.from("community_posts").select("id", head).eq("user_id", mine)),
    count(supabase.from("community_comments").select("id", head).eq("user_id", mine)),
  ]);
  return {
    answered,
    correct,
    streak: focus.streak,
    focusMinutes: focus.totalMinutes,
    materials,
    errorsResolved,
    simulados,
    stepsDone,
    feynman,
    journal,
    rooms,
    flashcardReviews,
    community: posts + comments,
  };
}

/** Guarda o XP no perfil (só o servidor grava) para os colegas verem o nível. Falha não atrapalha a página. */
export async function cacheXp(supabase: DB, xp: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await createAdminClient().from("profiles").update({ xp_cached: xp }).eq("id", user.id).neq("xp_cached", xp);
  if (error) console.error("[achievements] xp_cached:", error.message);
}

/** Conquistas desbloqueadas que o aluno ainda não viu anunciadas. */
export async function newAchievements(supabase: DB) {
  const [counts, { data: seen }] = await Promise.all([loadAchievementCounts(supabase), supabase.from("achievements_seen").select("badge_id")]);
  const seenIds = new Set((seen ?? []).map((s) => s.badge_id));
  await cacheXp(supabase, xpOf(counts));
  return evaluate(counts).filter((b) => b.unlocked && !seenIds.has(b.id));
}

export async function markSeen(supabase: DB, badgeIds: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !badgeIds.length) return;
  await supabase.from("achievements_seen").upsert(
    badgeIds.map((badge_id) => ({ user_id: user.id, badge_id })),
    { onConflict: "user_id,badge_id", ignoreDuplicates: true },
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api/route";
import type { StudyGoal } from "@/lib/news/catalog";
import { feedsFor, refreshFeeds } from "@/lib/news/service";

/** "Atualizar": busca de novo as fontes do aluno (as que estão há mais de 30 min sem atualizar). */
export const POST = apiRoute(z.object({}).strict(), async (_input, { supabase, user }) => {
  const [{ data: prefs }, { data: p }] = await Promise.all([
    supabase.from("news_prefs").select("sources, custom_feeds, state, city").maybeSingle(),
    supabase.from("profiles").select("study_goal").eq("id", user.id).single(),
  ]);
  if (prefs) await refreshFeeds(feedsFor(prefs, (p?.study_goal ?? null) as StudyGoal | null));
  return NextResponse.json({ ok: true });
});

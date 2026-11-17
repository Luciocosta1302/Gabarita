import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import type { StudyGoal } from "@/lib/news/catalog";
import { newsPrefsSchema } from "@/lib/news/schema";
import { feedsFor, refreshFeeds } from "@/lib/news/service";

/** Salva as fontes de notícias do aluno (e o objetivo) e já busca as notícias. */
export const POST = apiRoute(newsPrefsSchema, async (input, { supabase, user }) => {
  if (!input.sources.length && !input.custom_feeds.length && !input.state) {
    return jsonError("Escolha pelo menos uma fonte (ou sua região) para receber notícias.", 400);
  }
  const prefs = { sources: input.sources, custom_feeds: [...new Set(input.custom_feeds)], state: input.state, city: input.state ? input.city : null };
  const { error } = await supabase.from("news_prefs").upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() });
  if (error) throw error;
  if (input.goal) await supabase.from("profiles").update({ study_goal: input.goal }).eq("id", user.id);
  const { data: p } = await supabase.from("profiles").select("study_goal").eq("id", user.id).single();
  after(() => refreshFeeds(feedsFor(prefs, (p?.study_goal ?? null) as StudyGoal | null)));
  return NextResponse.json({ ok: true });
});

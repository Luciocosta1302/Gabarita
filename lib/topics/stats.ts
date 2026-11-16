import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { confidenceStats, type ConfidenceStat } from "@/lib/quiz/confidence";
import type { Database } from "@/lib/supabase/database.types";

import { topicMastery } from "./mastery";

export type TopicStat = {
  id: string;
  name: string;
  summary: string | null;
  chunks: number;
  answered: number;
  correct: number;
  mastery: number | null;
  confidence: ConfidenceStat[];
};

/** Tópicos da matéria com domínio (D8) e falsa certeza (D7) por tópico. */
export async function loadTopicStats(db: SupabaseClient<Database>, subjectId: string): Promise<TopicStat[]> {
  const [{ data: topics }, { data: chunks }, { data: attempts }] = await Promise.all([
    db.from("topics").select("id, name, summary, position").eq("subject_id", subjectId).order("position"),
    db.from("chunks").select("topic_id").eq("subject_id", subjectId).not("topic_id", "is", null).limit(10000),
    db
      .from("attempts")
      .select("correct, confidence, created_at, questions!inner(topic_id, subject_id)")
      .eq("questions.subject_id", subjectId)
      .not("questions.topic_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  const chunkCount = new Map<string, number>();
  for (const c of chunks ?? []) chunkCount.set(c.topic_id!, (chunkCount.get(c.topic_id!) ?? 0) + 1);
  const byTopic = new Map<string, { correct: boolean; confidence: string | null; created_at: string }[]>();
  for (const a of attempts ?? []) {
    const tid = a.questions.topic_id!;
    byTopic.set(tid, [...(byTopic.get(tid) ?? []), a]);
  }
  return (topics ?? []).map((t) => {
    const xs = byTopic.get(t.id) ?? [];
    return {
      id: t.id,
      name: t.name,
      summary: t.summary,
      chunks: chunkCount.get(t.id) ?? 0,
      answered: xs.length,
      correct: xs.filter((a) => a.correct).length,
      mastery: topicMastery(xs),
      confidence: confidenceStats(xs),
    };
  });
}

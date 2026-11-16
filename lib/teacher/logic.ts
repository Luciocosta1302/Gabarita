/** D4 — regras puras do perfil do professor. */
import type { TeacherProfile } from "@/lib/ai/prompts/teacher";

export type LikelyTopic = { topicId: string; name: string; weight: number; reason: string };

/** Liga os "tópicos com mais chance de cair" aos tópicos do material (ignora os sem correspondência). */
export function mapLikelyTopics(profile: TeacherProfile, topics: { id: string; name: string }[]): LikelyTopic[] {
  const seen = new Set<string>();
  const out: LikelyTopic[] = [];
  for (const l of [...profile.likely_topics].sort((a, b) => b.weight - a.weight)) {
    const t = topics[l.topic - 1];
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push({ topicId: t.id, name: t.name, weight: l.weight, reason: l.reason });
  }
  return out;
}

/** Nº de alternativas para gerar no estilo do professor (4 ou 5; padrão 4). */
export function teacherOptionsCount(profile: TeacherProfile) {
  return profile.options_count === 5 ? 5 : 4;
}

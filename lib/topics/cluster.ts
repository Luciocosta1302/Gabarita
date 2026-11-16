import "server-only";

import { generateJSON } from "@/lib/ai/provider";
import { topicsPrompt, type TopicsResult } from "@/lib/ai/prompts/topics";
import type { AdminClient } from "@/lib/supabase/admin";

const BATCH = 150;
const PREVIEW_CHARS = 350;

/**
 * Converte a resposta da IA em "trecho i → tópico" (índice existente ou chave nova).
 * Trecho sem tópico (ou com tópico inválido) herda o do trecho anterior; o primeiro herda o primeiro tópico.
 * Função pura (testada).
 */
export function resolveAssignments(
  result: TopicsResult,
  chunkCount: number,
  existingCount: number,
): { newTopics: TopicsResult["new_topics"]; byChunk: { kind: "existing" | "new"; ref: number | string }[] } {
  const newKeys = new Set(result.new_topics.map((t) => t.key));
  const valid = (topic: string) => {
    const m = topic.match(/^E(\d+)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= existingCount) return { kind: "existing" as const, ref: Number(m[1]) - 1 };
    if (newKeys.has(topic)) return { kind: "new" as const, ref: topic };
    return null;
  };
  const map = new Map<number, ReturnType<typeof valid>>();
  for (const a of result.assignments) if (a.chunk >= 1 && a.chunk <= chunkCount) map.set(a.chunk - 1, valid(a.topic));

  const fallback =
    existingCount > 0
      ? { kind: "existing" as const, ref: 0 }
      : result.new_topics[0]
        ? { kind: "new" as const, ref: result.new_topics[0].key }
        : null;
  const byChunk: { kind: "existing" | "new"; ref: number | string }[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const v = map.get(i) ?? byChunk[i - 1] ?? fallback;
    if (!v) throw new Error("A IA não devolveu nenhum tópico.");
    byChunk.push(v);
  }
  // só cria os tópicos novos que receberam algum trecho
  const usedNew = new Set(byChunk.filter((b) => b.kind === "new").map((b) => b.ref));
  return { newTopics: result.new_topics.filter((t) => usedNew.has(t.key)), byChunk };
}

/** D8 — dá tópico aos trechos ainda sem tópico da matéria. Roda no job (service role). */
export async function clusterSubjectTopics(admin: AdminClient, subjectId: string) {
  const { data: subject } = await admin.from("subjects").select("id, user_id, name").eq("id", subjectId).single();
  if (!subject) throw new Error("Matéria não encontrada");

  const { data: pending } = await admin
    .from("chunks")
    .select("id, content, material_id, chunk_index, materials(created_at)")
    .eq("subject_id", subjectId)
    .is("topic_id", null)
    .limit(5000);
  if (!pending?.length) return { assigned: 0, created: 0 };
  // ordem de leitura: material mais antigo primeiro, depois a ordem dos trechos
  pending.sort(
    (a, b) =>
      (a.materials?.created_at ?? "").localeCompare(b.materials?.created_at ?? "") ||
      a.material_id.localeCompare(b.material_id) ||
      a.chunk_index - b.chunk_index,
  );

  let created = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const { data: topics } = await admin
      .from("topics")
      .select("id, name, summary, position")
      .eq("subject_id", subjectId)
      .order("position");
    const existing = topics ?? [];

    const { data } = await generateJSON(
      topicsPrompt({
        subjectName: subject.name,
        existing,
        chunks: batch.map((c) => ({ preview: c.content.slice(0, PREVIEW_CHARS) })),
      }),
    );
    const { newTopics, byChunk } = resolveAssignments(data, batch.length, existing.length);

    const newIds = new Map<string, string>();
    if (newTopics.length) {
      const start = existing.reduce((m, t) => Math.max(m, t.position + 1), 0);
      const { data: inserted, error } = await admin
        .from("topics")
        .insert(newTopics.map((t, k) => ({ user_id: subject.user_id, subject_id: subjectId, name: t.name, summary: t.summary, position: start + k })))
        .select("id");
      if (error || !inserted) throw error ?? new Error("Falha ao criar tópicos");
      newTopics.forEach((t, k) => newIds.set(t.key, inserted[k].id));
      created += inserted.length;
    }

    // agrupa as atualizações por tópico
    const groups = new Map<string, string[]>();
    batch.forEach((c, k) => {
      const b = byChunk[k];
      const topicId = b.kind === "existing" ? existing[b.ref as number].id : newIds.get(b.ref as string)!;
      groups.set(topicId, [...(groups.get(topicId) ?? []), c.id]);
    });
    for (const [topicId, ids] of groups) {
      const { error } = await admin.from("chunks").update({ topic_id: topicId }).in("id", ids);
      if (error) throw error;
      // questões já geradas desses trechos ganham o tópico também
      await admin.from("questions").update({ topic_id: topicId }).in("chunk_id", ids).is("topic_id", null);
    }
  }
  return { assigned: pending.length, created };
}

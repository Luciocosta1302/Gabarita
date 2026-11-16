import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON, transcribe } from "@/lib/ai/provider";
import { feynmanPrompt } from "@/lib/ai/prompts/feynman";
import { sourceAt } from "@/lib/ai/prompts/sources";
import { UserFacingError } from "@/lib/errors";
import type { Database, Json } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;
const CHUNKS = 6;

/**
 * D9 — Modo Feynman: (transcreve o áudio, se houver) e compara a explicação do aluno com os trechos
 * do tópico no material. Salva a sessão com a nota e o feedback.
 */
export async function runFeynman(db: DB, userId: string, input: { topicId: string; text?: string; audio?: Uint8Array }) {
  const { data: topic } = await db.from("topics").select("id, name, subject_id").eq("id", input.topicId).maybeSingle();
  if (!topic) throw new UserFacingError("Tópico não encontrado.");

  let explanation = input.text?.trim() ?? "";
  if (input.audio) {
    const { text } = await transcribe({ data: input.audio, filename: "feynman.wav", mimeType: "audio/wav", language: "pt" });
    explanation = text.trim();
    if (explanation.length < 15) throw new UserFacingError("Não deu para entender o áudio. Tente gravar de novo, mais perto do microfone.");
  }

  const { data: all } = await db.from("chunks").select("id, page, content").eq("topic_id", topic.id).order("chunk_index").limit(200);
  const pool = all ?? [];
  if (!pool.length) throw new UserFacingError("Esse tópico ainda não tem trechos do material.");
  const step = Math.max(1, pool.length / CHUNKS);
  const chunks = Array.from({ length: Math.min(CHUNKS, pool.length) }, (_, i) => pool[Math.floor(i * step)]);

  const { data } = await generateJSON(feynmanPrompt({ topic: topic.name, explanation, chunks }));
  const citations = [...new Set(data.sources)]
    .map((n) => ({ n, chunk: sourceAt(chunks, n) }))
    .filter((c) => c.chunk)
    .map((c) => ({ n: c.n, chunk_id: c.chunk!.id, page: c.chunk!.page }));
  const feedback = { ...data, citations };

  const { data: session, error } = await db
    .from("feynman_sessions")
    .insert({
      user_id: userId,
      subject_id: topic.subject_id,
      topic_id: topic.id,
      transcript: explanation,
      mode: input.audio ? "audio" : "texto",
      score: data.score,
      feedback_json: feedback as unknown as NonNullable<Json>,
    })
    .select("id")
    .single();
  if (error || !session) throw error ?? new Error("Falha ao salvar a sessão");
  return { id: session.id, transcript: explanation, feedback };
}

import "server-only";

import { generateJSON } from "@/lib/ai/provider";
import { errorFollowupPrompt } from "@/lib/ai/prompts/error-followup";
import { indexToLetter, letterToIndex, shuffleOptions } from "@/lib/quiz/options";
import type { AdminClient } from "@/lib/supabase/admin";
import { findQuote } from "@/lib/text/quote";

/**
 * D6 — para uma entrada do caderno de erros: explica o erro e cria uma questão parecida,
 * presa ao mesmo trecho do material. Roda no job (service role), então preenche user_id na mão.
 */
export async function createErrorFollowup(admin: AdminClient, notebookId: string) {
  const { data: entry, error } = await admin
    .from("error_notebook")
    .select(
      "id, user_id, followup_status, attempts(answer, questions(id, subject_id, chunk_id, topic_id, stem, options_json, answer, explanation, source_page, chunks(content, page)))",
    )
    .eq("id", notebookId)
    .single();
  if (error || !entry) throw error ?? new Error("Entrada do caderno não encontrada");
  if (entry.followup_status === "ready") return;

  const q = entry.attempts?.questions;
  if (!q) throw new Error("Questão original não encontrada");
  const options = (q.options_json as string[] | null) ?? [];
  const chunk = q.chunks;

  const { data } = await generateJSON(
    errorFollowupPrompt({
      stem: q.stem,
      options,
      correctIndex: letterToIndex(q.answer),
      chosenIndex: letterToIndex(entry.attempts!.answer),
      explanation: q.explanation,
      source: chunk ? { content: chunk.content, page: chunk.page } : null,
    }),
  );

  const f = data.followup;
  const shuffled = shuffleOptions(f.options, f.answer_index);
  const quoteOk = chunk ? findQuote(chunk.content, f.quote) !== null : false;

  const { data: inserted, error: insError } = await admin
    .from("questions")
    .insert({
      user_id: entry.user_id,
      subject_id: q.subject_id,
      chunk_id: q.chunk_id,
      topic_id: q.topic_id,
      type: "multiple_choice",
      stem: f.stem,
      options_json: shuffled.options,
      answer: indexToLetter(shuffled.answerIndex),
      explanation: f.explanation,
      difficulty: f.difficulty,
      source_page: q.source_page,
      source_quote: quoteOk ? f.quote : null,
      origin: "followup",
    })
    .select("id")
    .single();
  if (insError || !inserted) throw insError ?? new Error("Falha ao salvar a questão parecida");

  await admin
    .from("error_notebook")
    .update({ why_wrong: data.why_wrong, followup_question_id: inserted.id, followup_status: "ready" })
    .eq("id", notebookId);
}

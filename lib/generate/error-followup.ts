import "server-only";

import { generateJSON } from "@/lib/ai/provider";
import { errorFollowupPrompt, errorFollowupTfPrompt } from "@/lib/ai/prompts/error-followup";
import { indexToLetter, letterToIndex, shuffleOptions } from "@/lib/quiz/options";
import type { AdminClient } from "@/lib/supabase/admin";
import { findQuote } from "@/lib/text/quote";

import { TRUE_FALSE_OPTIONS } from "./questions";

/**
 * D6 — para uma entrada do caderno de erros: explica o erro e cria uma questão parecida,
 * presa ao mesmo trecho do material. Roda no job (service role), então preenche user_id na mão.
 */
export async function createErrorFollowup(admin: AdminClient, notebookId: string) {
  const { data: entry, error } = await admin
    .from("error_notebook")
    .select(
      "id, user_id, followup_status, attempts(answer, questions(id, subject_id, chunk_id, topic_id, type, style, stem, options_json, answer, explanation, source_page, chunks(content, page)))",
    )
    .eq("id", notebookId)
    .single();
  if (error || !entry) throw error ?? new Error("Entrada do caderno não encontrada");
  if (entry.followup_status === "ready") return;

  const q = entry.attempts?.questions;
  if (!q) throw new Error("Questão original não encontrada");
  const options = (q.options_json as string[] | null) ?? [];
  const chunk = q.chunks;

  const source = chunk ? { content: chunk.content, page: chunk.page } : null;
  let whyWrong: string;
  let followup: { stem: string; options: string[]; answerIndex: number; quote: string; explanation: string; difficulty: string };
  if (q.type === "true_false") {
    const { data } = await generateJSON(
      errorFollowupTfPrompt({ statement: q.stem, isTrue: letterToIndex(q.answer) === 0, explanation: q.explanation, source }),
    );
    whyWrong = data.why_wrong;
    const f = data.followup;
    followup = { stem: f.statement, options: TRUE_FALSE_OPTIONS, answerIndex: f.is_true ? 0 : 1, quote: f.quote, explanation: f.explanation, difficulty: f.difficulty };
  } else {
    const { data } = await generateJSON(
      errorFollowupPrompt({
        stem: q.stem,
        options,
        correctIndex: letterToIndex(q.answer),
        chosenIndex: letterToIndex(entry.attempts!.answer),
        explanation: q.explanation,
        source,
      }),
    );
    whyWrong = data.why_wrong;
    const f = data.followup;
    const shuffled = shuffleOptions(f.options, f.answer_index);
    followup = { stem: f.stem, options: shuffled.options, answerIndex: shuffled.answerIndex, quote: f.quote, explanation: f.explanation, difficulty: f.difficulty };
  }
  const quoteOk = chunk ? findQuote(chunk.content, followup.quote) !== null : false;

  const { data: inserted, error: insError } = await admin
    .from("questions")
    .insert({
      user_id: entry.user_id,
      subject_id: q.subject_id,
      chunk_id: q.chunk_id,
      topic_id: q.topic_id,
      type: q.type,
      style: q.style,
      stem: followup.stem,
      options_json: followup.options,
      answer: indexToLetter(followup.answerIndex),
      explanation: followup.explanation,
      difficulty: followup.difficulty,
      source_page: q.source_page,
      source_quote: quoteOk ? followup.quote : null,
      origin: "followup",
    })
    .select("id")
    .single();
  if (insError || !inserted) throw insError ?? new Error("Falha ao salvar a questão parecida");

  await admin
    .from("error_notebook")
    .update({ why_wrong: whyWrong, followup_question_id: inserted.id, followup_status: "ready" })
    .eq("id", notebookId);
}

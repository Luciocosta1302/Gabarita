import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { enqueueJob } from "@/lib/jobs/queue";
import { gradeFromAttempt } from "@/lib/srs/fsrs";
import { gradeItem } from "@/lib/srs/service";
import type { Database } from "@/lib/supabase/database.types";

import { isCorrect } from "./options";

type DB = SupabaseClient<Database>;

export type AttemptResult = {
  attempt_id: string;
  question_id: string;
  correct: boolean;
  answer: string;
  explanation: string | null;
  chunk_id: string | null;
  source_page: number | null;
  notebook_id: string | null;
};

export type AttemptInput = {
  questionId: string;
  quizId?: string | null;
  answer: string;
  confidence: string | null;
  timeMs?: number | null;
};

type QuestionRow = {
  id: string;
  subject_id: string;
  answer: string;
  explanation: string | null;
  chunk_id: string | null;
  source_page: number | null;
};

/**
 * Registra uma resposta (a correção é feita aqui; o navegador não conhece o gabarito):
 * - errou → caderno de erros (D6) + job da questão parecida; a questão entra na revisão espaçada (D3);
 * - acertou → resolve a entrada do caderno (se for a questão parecida) e, se a questão está na revisão, reagenda.
 * Devolve `queuedJobs` = true quando há job para processar (a rota chama runJobs no after()).
 */
export async function recordAttempt(db: DB, userId: string, q: QuestionRow, input: AttemptInput) {
  const correct = isCorrect(input.answer, q.answer);
  const { data: attempt, error } = await db
    .from("attempts")
    .insert({
      user_id: userId,
      question_id: q.id,
      quiz_id: input.quizId ?? null,
      answer: input.answer,
      correct,
      confidence: input.confidence,
      time_ms: input.timeMs ?? null,
    })
    .select("id")
    .single();
  if (error || !attempt) throw error ?? new Error("Falha ao salvar a resposta");

  let notebookId: string | null = null;
  if (correct) {
    await db
      .from("error_notebook")
      .update({ resolved_at: new Date().toISOString() })
      .eq("followup_question_id", q.id)
      .is("resolved_at", null);
  } else {
    const { data: entry, error: nbError } = await db
      .from("error_notebook")
      .insert({ user_id: userId, attempt_id: attempt.id })
      .select("id")
      .single();
    if (nbError || !entry) throw nbError ?? new Error("Falha ao salvar no caderno de erros");
    notebookId = entry.id;
    await enqueueJob(db, userId, "error_followup", { notebook_id: entry.id });
  }

  await gradeItem(
    db,
    userId,
    { subjectId: q.subject_id, itemType: "question", itemId: q.id },
    gradeFromAttempt(correct, input.confidence),
    { onlyIfTracked: correct },
  );

  const result: AttemptResult = {
    attempt_id: attempt.id,
    question_id: q.id,
    correct,
    answer: q.answer,
    explanation: q.explanation,
    chunk_id: q.chunk_id,
    source_page: q.source_page,
    notebook_id: notebookId,
  };
  return { result, queuedJobs: !correct };
}

export const QUESTION_FIELDS = "id, subject_id, answer, explanation, chunk_id, source_page" as const;

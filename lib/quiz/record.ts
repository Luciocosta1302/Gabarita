import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { enqueueJob } from "@/lib/jobs/queue";
import { gradeFromAttempt } from "@/lib/srs/fsrs";
import { gradeItem } from "@/lib/srs/service";
import { generateJSON } from "@/lib/ai/provider";
import { gradeOpenPrompt, type OpenGrade } from "@/lib/ai/prompts/open";
import type { Database, Json } from "@/lib/supabase/database.types";

import { isCorrect } from "./options";
import { PASSING_SCORE, rubricScore } from "./rubric";

type DB = SupabaseClient<Database>;

export type OpenFeedback = OpenGrade & { score: number };

export type AttemptResult = {
  attempt_id: string;
  question_id: string;
  correct: boolean;
  answer: string;
  explanation: string | null;
  chunk_id: string | null;
  source_page: number | null;
  notebook_id: string | null;
  /** discursivas (D10): nota 0–10 e correção por critério */
  score?: number;
  feedback?: OpenFeedback;
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
export const OPEN_FIELDS = "id, subject_id, answer, explanation, chunk_id, source_page, type, stem, rubric_json" as const;

/**
 * D10 — resposta discursiva: a IA corrige com a rubrica (conteúdo, clareza, termos) e a nota vai para a tentativa.
 * Nota >= 6 conta como acerto (domínio por tópico). Discursivas não entram no caderno de erros nem na revisão.
 */
export async function recordOpenAttempt(
  db: DB,
  userId: string,
  q: QuestionRow & { stem: string; rubric_json: unknown },
  input: AttemptInput,
) {
  const rubric = (q.rubric_json ?? { key_points: [], key_terms: [] }) as { key_points: string[]; key_terms: string[] };
  const { data: chunk } = q.chunk_id ? await db.from("chunks").select("content").eq("id", q.chunk_id).maybeSingle() : { data: null };
  const { data: grade } = await generateJSON(
    gradeOpenPrompt({
      stem: q.stem,
      expected: q.answer,
      keyPoints: rubric.key_points,
      keyTerms: rubric.key_terms,
      source: chunk?.content ?? null,
      answer: input.answer,
    }),
  );
  const score = rubricScore(grade.criteria);
  const feedback: OpenFeedback = { ...grade, score };
  const correct = score >= PASSING_SCORE;
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
      score,
      feedback_json: feedback as unknown as NonNullable<Json>,
    })
    .select("id")
    .single();
  if (error || !attempt) throw error ?? new Error("Falha ao salvar a resposta");
  const result: AttemptResult = {
    attempt_id: attempt.id,
    question_id: q.id,
    correct,
    answer: q.answer,
    explanation: q.explanation,
    chunk_id: q.chunk_id,
    source_page: q.source_page,
    notebook_id: null,
    score,
    feedback,
  };
  return { result, queuedJobs: false };
}

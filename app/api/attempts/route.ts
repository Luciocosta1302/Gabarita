import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { isCorrect } from "@/lib/quiz/options";
import { attemptSchema } from "@/lib/validation/generate";

export type AttemptResult = {
  attempt_id: string;
  correct: boolean;
  answer: string;
  explanation: string | null;
  chunk_id: string | null;
  source_page: number | null;
  notebook_id: string | null;
};

/**
 * Registra uma resposta. A correção é feita aqui (o navegador não conhece o gabarito).
 * Errou → entra no caderno de erros (D6) e um job cria a explicação + questão parecida.
 * Acertou uma questão parecida → a entrada do caderno fica como resolvida.
 */
export const POST = apiRoute(attemptSchema, async (input, { supabase, user }) => {
  const { data: q } = await supabase
    .from("questions")
    .select("id, answer, explanation, chunk_id, source_page")
    .eq("id", input.question_id)
    .maybeSingle();
  if (!q) return jsonError("Questão não encontrada.", 404);

  if (input.quiz_id) {
    const { data: quiz } = await supabase.from("quizzes").select("question_ids").eq("id", input.quiz_id).maybeSingle();
    if (!quiz?.question_ids.includes(q.id)) return jsonError("Questão não pertence a este quiz.", 400);

    // Responder duas vezes a mesma questão do quiz devolve a primeira resposta (evita duplicar o caderno).
    const { data: previous } = await supabase
      .from("attempts")
      .select("id, correct, error_notebook(id)")
      .eq("quiz_id", input.quiz_id)
      .eq("question_id", q.id)
      .maybeSingle();
    if (previous) return NextResponse.json(result(previous.id, previous.correct, q, previous.error_notebook?.id ?? null));
  }

  const correct = isCorrect(input.answer, q.answer);
  const { data: attempt, error } = await supabase
    .from("attempts")
    .insert({
      user_id: user.id,
      question_id: q.id,
      quiz_id: input.quiz_id ?? null,
      answer: input.answer,
      correct,
      confidence: input.confidence,
      time_ms: input.time_ms ?? null,
    })
    .select("id")
    .single();
  if (error || !attempt) throw error ?? new Error("Falha ao salvar a resposta");

  let notebookId: string | null = null;
  if (correct) {
    await supabase
      .from("error_notebook")
      .update({ resolved_at: new Date().toISOString() })
      .eq("followup_question_id", q.id)
      .is("resolved_at", null);
  } else {
    const { data: entry, error: nbError } = await supabase
      .from("error_notebook")
      .insert({ user_id: user.id, attempt_id: attempt.id })
      .select("id")
      .single();
    if (nbError || !entry) throw nbError ?? new Error("Falha ao salvar no caderno de erros");
    notebookId = entry.id;
    await enqueueJob(supabase, user.id, "error_followup", { notebook_id: entry.id });
    after(() => runJobs({ userId: user.id }));
  }

  return NextResponse.json(result(attempt.id, correct, q, notebookId));
});

function result(
  attemptId: string,
  correct: boolean,
  q: { answer: string; explanation: string | null; chunk_id: string | null; source_page: number | null },
  notebookId: string | null,
): AttemptResult {
  return {
    attempt_id: attemptId,
    correct,
    answer: q.answer,
    explanation: q.explanation,
    chunk_id: q.chunk_id,
    source_page: q.source_page,
    notebook_id: notebookId,
  };
}

import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { runJobs } from "@/lib/jobs/queue";
import { QUESTION_FIELDS, recordAttempt, type AttemptResult } from "@/lib/quiz/record";
import { attemptSchema } from "@/lib/validation/generate";

export type { AttemptResult };

/** Registra uma resposta (quiz de prática, revisão ou questão parecida do caderno). */
export const POST = apiRoute(attemptSchema, async (input, { supabase, user }) => {
  const { data: q } = await supabase.from("questions").select(QUESTION_FIELDS).eq("id", input.question_id).maybeSingle();
  if (!q) return jsonError("Questão não encontrada.", 404);

  if (input.quiz_id) {
    const { data: quiz } = await supabase.from("quizzes").select("question_ids, mode").eq("id", input.quiz_id).maybeSingle();
    if (!quiz?.question_ids.includes(q.id)) return jsonError("Questão não pertence a este quiz.", 400);
    if (quiz.mode === "simulado") return jsonError("No simulado, as respostas são enviadas no fim.", 400);

    // Responder duas vezes a mesma questão do quiz devolve a primeira resposta (evita duplicar o caderno).
    const { data: previous } = await supabase
      .from("attempts")
      .select("id, correct, error_notebook(id)")
      .eq("quiz_id", input.quiz_id)
      .eq("question_id", q.id)
      .maybeSingle();
    if (previous) {
      const r: AttemptResult = {
        attempt_id: previous.id,
        question_id: q.id,
        correct: previous.correct,
        answer: q.answer,
        explanation: q.explanation,
        chunk_id: q.chunk_id,
        source_page: q.source_page,
        notebook_id: previous.error_notebook?.id ?? null,
      };
      return NextResponse.json(r);
    }
  }

  const { result, queuedJobs } = await recordAttempt(supabase, user.id, q, {
    questionId: q.id,
    quizId: input.quiz_id,
    answer: input.answer,
    confidence: input.confidence,
    timeMs: input.time_ms,
  });
  if (queuedJobs) after(() => runJobs({ userId: user.id }));
  return NextResponse.json(result);
});

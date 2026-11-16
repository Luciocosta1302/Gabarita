import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { runJobs } from "@/lib/jobs/queue";
import { OPEN_FIELDS, recordAttempt, recordOpenAttempt, type AttemptResult } from "@/lib/quiz/record";
import { attemptSchema } from "@/lib/validation/generate";

export type { AttemptResult };

export const maxDuration = 120; // discursivas são corrigidas pela IA

/** Registra uma resposta (quiz de prática, revisão ou questão parecida do caderno). */
export const POST = apiRoute(attemptSchema, async (input, { supabase, user }) => {
  const { data: q } = await supabase.from("questions").select(OPEN_FIELDS).eq("id", input.question_id).maybeSingle();
  if (!q) return jsonError("Questão não encontrada.", 404);
  const open = q.type === "open";
  if (!open && !/^[A-E]$/.test(input.answer)) return jsonError("Escolha uma alternativa.", 400);

  if (input.quiz_id) {
    const { data: quiz } = await supabase.from("quizzes").select("question_ids, mode").eq("id", input.quiz_id).maybeSingle();
    if (!quiz?.question_ids.includes(q.id)) return jsonError("Questão não pertence a este quiz.", 400);
    if (quiz.mode === "simulado") return jsonError("No simulado, as respostas são enviadas no fim.", 400);

    // Responder duas vezes a mesma questão do quiz devolve a primeira resposta (evita duplicar o caderno).
    const { data: previous } = await supabase
      .from("attempts")
      .select("id, correct, score, feedback_json, error_notebook(id)")
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
        ...(previous.score != null ? { score: Number(previous.score), feedback: previous.feedback_json as AttemptResult["feedback"] } : {}),
      };
      return NextResponse.json(r);
    }
  }

  const record = open ? recordOpenAttempt : recordAttempt;
  const { result, queuedJobs } = await record(supabase, user.id, q, {
    questionId: q.id,
    quizId: input.quiz_id,
    answer: input.answer,
    confidence: input.confidence,
    timeMs: input.time_ms,
  });
  if (queuedJobs) after(() => runJobs({ userId: user.id }));
  return NextResponse.json(result);
});

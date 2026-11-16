import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { runJobs } from "@/lib/jobs/queue";
import { QUESTION_FIELDS, recordAttempt } from "@/lib/quiz/record";
import { simuladoFinishSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/**
 * D16 — entrega o simulado: corrige tudo de uma vez. Questões em branco não geram tentativa
 * (aparecem como "em branco" no relatório). Erros vão para o caderno, como no quiz.
 */
export const POST = apiRoute(simuladoFinishSchema, async (input, { supabase, user }) => {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, mode, question_ids, finished_at")
    .eq("id", input.quiz_id)
    .maybeSingle();
  if (!quiz || quiz.mode !== "simulado") return jsonError("Simulado não encontrado.", 404);
  if (quiz.finished_at) return NextResponse.json({ ok: true, already: true });

  // marca como entregue antes de corrigir (evita entrega dupla em dois cliques)
  const { data: claimed } = await supabase
    .from("quizzes")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", quiz.id)
    .is("finished_at", null)
    .select("id");
  if (!claimed?.length) return NextResponse.json({ ok: true, already: true });

  const answered = input.answers.filter((a) => a.answer && quiz.question_ids.includes(a.question_id));
  const { data: questions } = await supabase.from("questions").select(QUESTION_FIELDS).in("id", answered.map((a) => a.question_id));
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));

  let queued = false;
  for (const a of answered) {
    const q = byId.get(a.question_id);
    if (!q) continue;
    const { queuedJobs } = await recordAttempt(supabase, user.id, q, {
      questionId: q.id,
      quizId: quiz.id,
      answer: a.answer!,
      confidence: a.confidence,
      timeMs: a.time_ms,
    });
    queued ||= queuedJobs;
  }
  if (queued) after(() => runJobs({ userId: user.id }));
  return NextResponse.json({ ok: true, answered: answered.length });
});

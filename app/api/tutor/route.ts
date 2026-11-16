import { after, NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { assertQuestionQuota } from "@/lib/billing/limits";
import { runJobs } from "@/lib/jobs/queue";
import { answerStep, askTutor, explainAgain, startStep } from "@/lib/paths/service";
import { tutorActionSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** Tutor IA de uma etapa da trilha: abrir, responder, pedir outra explicação ou tirar dúvida. */
export const POST = apiRoute(tutorActionSchema, async (input, { supabase, user }) => {
  // abrir a etapa e responder criam uma questão nova (conta na cota diária do plano grátis)
  if (input.action === "start" || input.action === "answer") await assertQuestionQuota(supabase, user.id, 1);
  switch (input.action) {
    case "start":
      await startStep(supabase, user.id, input.step_id);
      return NextResponse.json({ ok: true });
    case "answer": {
      const { result, queuedJobs, passed } = await answerStep(supabase, user.id, input.step_id, {
        questionId: input.question_id,
        answer: input.answer,
        confidence: input.confidence,
      });
      if (queuedJobs) after(() => runJobs({ userId: user.id }));
      return NextResponse.json({ ...result, passed });
    }
    case "again":
      await explainAgain(supabase, user.id, input.step_id);
      return NextResponse.json({ ok: true });
    case "ask":
      await askTutor(supabase, user.id, input.step_id, input.question);
      return NextResponse.json({ ok: true });
  }
});

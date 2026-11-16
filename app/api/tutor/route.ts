import { after, NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { assertQuestionQuota } from "@/lib/billing/limits";
import { runJobs } from "@/lib/jobs/queue";
import { answerStep, askTutor, continueStep, explainAgain, startStep } from "@/lib/paths/service";
import { tutorActionSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** Tutor IA de uma etapa da trilha: abrir, responder, pedir outra explicação ou tirar dúvida. */
export const POST = apiRoute(tutorActionSchema, async (input, { supabase, user }) => {
  // abrir a etapa, responder e seguir criam uma questão nova (conta na cota diária do plano grátis);
  // ao responder, a cota só é checada se a etapa continuar (a resposta em si sempre é aceita)
  const quota = () => assertQuestionQuota(supabase, user.id, 1);
  if (input.action === "start" || input.action === "continue") await quota();
  switch (input.action) {
    case "start":
      await startStep(supabase, user.id, input.step_id);
      return NextResponse.json({ ok: true });
    case "answer": {
      const { result, queuedJobs, passed } = await answerStep(supabase, user.id, input.step_id, {
        questionId: input.question_id,
        answer: input.answer,
        confidence: input.confidence,
      }, quota);
      if (queuedJobs) after(() => runJobs({ userId: user.id }));
      return NextResponse.json({ ...result, passed });
    }
    case "continue":
      await continueStep(supabase, user.id, input.step_id);
      return NextResponse.json({ ok: true });
    case "again":
      await explainAgain(supabase, user.id, input.step_id);
      return NextResponse.json({ ok: true });
    case "ask":
      await askTutor(supabase, user.id, input.step_id, input.question);
      return NextResponse.json({ ok: true });
  }
});

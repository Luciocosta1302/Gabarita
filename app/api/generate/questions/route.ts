import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { generateQuiz } from "@/lib/generate/questions";
import { generateQuestionsSchema } from "@/lib/validation/generate";

export const maxDuration = 300;

export const POST = apiRoute(generateQuestionsSchema, async (input, { supabase, user }) => {
  const result = await generateQuiz(supabase, user.id, {
    subjectId: input.subject_id,
    materialId: input.material_id,
    topicId: input.topic_id,
    count: input.count,
    difficulty: input.difficulty,
    style: input.style,
    mode: input.mode,
  });
  return NextResponse.json({ quiz_id: result.quizId, count: result.count, requested: result.requested }, { status: 201 });
}, { ai: true });

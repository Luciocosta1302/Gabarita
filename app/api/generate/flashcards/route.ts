import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { generateFlashcards } from "@/lib/generate/flashcards";
import { generateFlashcardsSchema } from "@/lib/validation/generate";

export const maxDuration = 300;

export const POST = apiRoute(generateFlashcardsSchema, async (input, { supabase, user }) => {
  const result = await generateFlashcards(supabase, user.id, {
    subjectId: input.subject_id,
    materialId: input.material_id,
    count: input.count,
  });
  return NextResponse.json(result, { status: 201 });
}, { ai: true });

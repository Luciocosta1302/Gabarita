import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { gradeItem } from "@/lib/srs/service";
import { reviewSchema } from "@/lib/validation/generate";

/** D3 — nota de um flashcard na revisão ("errei/difícil/bom/fácil") → reagenda com FSRS. */
export const POST = apiRoute(reviewSchema, async (input, { supabase, user }) => {
  const { data: card } = await supabase.from("flashcards").select("id, subject_id").eq("id", input.flashcard_id).maybeSingle();
  if (!card) return jsonError("Flashcard não encontrado.", 404);
  const dueAt = await gradeItem(supabase, user.id, { subjectId: card.subject_id, itemType: "flashcard", itemId: card.id }, input.grade);
  return NextResponse.json({ due_at: dueAt });
});

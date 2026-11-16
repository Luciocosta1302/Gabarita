import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import { flashcardsPrompt } from "@/lib/ai/prompts/flashcards";
import { sourceAt, type SourceChunk } from "@/lib/ai/prompts/sources";
import { UserFacingError } from "@/lib/errors";
import { addToReview } from "@/lib/srs/service";
import type { Database } from "@/lib/supabase/database.types";

import { pickChunks } from "./pick";

type DB = SupabaseClient<Database>;

export async function generateFlashcards(
  supabase: DB,
  userId: string,
  input: { subjectId: string; materialId?: string; count: number },
) {
  let q = supabase
    .from("chunks")
    .select("id, page, content")
    .eq("subject_id", input.subjectId)
    .order("material_id")
    .order("chunk_index")
    .limit(5000);
  if (input.materialId) q = q.eq("material_id", input.materialId);
  const { data: all } = await q;
  if (!all?.length) throw new UserFacingError("Envie um material e espere ele ficar pronto antes de criar flashcards.");

  const { data: usedRows } = await supabase
    .from("flashcards")
    .select("chunk_id")
    .eq("subject_id", input.subjectId)
    .not("chunk_id", "is", null);
  const used = new Set((usedRows ?? []).map((r) => r.chunk_id as string));

  const chunks: SourceChunk[] = pickChunks(all, used, Math.min(input.count, 20));
  const { data } = await generateJSON(flashcardsPrompt({ chunks, count: input.count }));

  const rows = data.cards
    .map((c) => ({ card: c, chunk: sourceAt(chunks, c.source) }))
    .filter((x) => x.chunk)
    .slice(0, input.count)
    .map(({ card, chunk }) => ({
      user_id: userId,
      subject_id: input.subjectId,
      chunk_id: chunk!.id,
      front: card.front,
      back: card.back,
    }));
  if (rows.length === 0) throw new UserFacingError("Não foi possível criar flashcards com base no material.");

  const { data: inserted, error } = await supabase.from("flashcards").insert(rows).select("id");
  if (error || !inserted) throw error ?? new Error("Falha ao salvar flashcards");
  // D3: todo flashcard novo entra na revisão espaçada (vence hoje).
  await addToReview(supabase, userId, input.subjectId, "flashcard", inserted.map((r) => r.id));
  return { count: inserted.length };
}

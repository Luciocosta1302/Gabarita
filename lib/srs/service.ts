import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import { newCard, review, type FsrsState, type ReviewGrade } from "./fsrs";

type DB = SupabaseClient<Database>;
type ItemType = "flashcard" | "question";

/** Coloca itens novos na fila de revisão (vencem agora). Itens que já estão na fila ficam como estão. */
export async function addToReview(db: DB, userId: string, subjectId: string, itemType: ItemType, itemIds: string[]) {
  if (!itemIds.length) return;
  const { state, dueAt } = newCard();
  const { error } = await db.from("reviews").upsert(
    itemIds.map((id) => ({
      user_id: userId,
      subject_id: subjectId,
      item_type: itemType,
      item_id: id,
      fsrs_state_json: state as unknown as NonNullable<Json>,
      due_at: dueAt,
    })),
    { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/**
 * Registra uma revisão e reagenda o item (FSRS).
 * `onlyIfTracked`: só atualiza se o item já estiver na fila (ex.: acertar uma questão que nunca errou não entra).
 */
export async function gradeItem(
  db: DB,
  userId: string,
  item: { subjectId: string; itemType: ItemType; itemId: string },
  grade: ReviewGrade,
  { onlyIfTracked = false, now = new Date() } = {},
) {
  const { data: existing } = await db
    .from("reviews")
    .select("id, fsrs_state_json")
    .eq("user_id", userId)
    .eq("item_type", item.itemType)
    .eq("item_id", item.itemId)
    .maybeSingle();
  if (!existing && onlyIfTracked) return null;

  const next = review((existing?.fsrs_state_json as FsrsState | null) ?? null, grade, now);
  const row = {
    user_id: userId,
    subject_id: item.subjectId,
    item_type: item.itemType,
    item_id: item.itemId,
    fsrs_state_json: next.state as unknown as NonNullable<Json>,
    due_at: next.dueAt,
    last_reviewed_at: now.toISOString(),
  };
  const { error } = existing
    ? await db.from("reviews").update(row).eq("id", existing.id)
    : await db.from("reviews").insert(row);
  if (error) throw error;
  return next.dueAt;
}

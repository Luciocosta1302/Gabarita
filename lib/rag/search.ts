import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { cachedEmbed } from "@/lib/ai/embed-cache";
import { toPgVector } from "@/lib/ingest/embed";
import type { Database } from "@/lib/supabase/database.types";

export type FoundChunk = {
  id: string;
  material_id: string;
  content: string;
  page: number | null;
  similarity: number;
};

/** Busca os trechos mais parecidos com a pergunta dentro de uma matéria (RLS continua valendo). */
export async function searchChunks(
  supabase: SupabaseClient<Database>,
  subjectId: string,
  query: string,
  k = 8,
): Promise<FoundChunk[]> {
  const [vector] = await cachedEmbed([query], { purpose: "query" });
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: toPgVector(vector),
    p_subject_id: subjectId,
    k,
  });
  if (error) throw error;
  return (data ?? []) as FoundChunk[];
}

/** Busca só dentro de um material (chat por documento na Biblioteca). */
export async function searchMaterialChunks(supabase: SupabaseClient<Database>, materialId: string, query: string, k = 8): Promise<FoundChunk[]> {
  const [vector] = await cachedEmbed([query], { purpose: "query" });
  const { data, error } = await supabase.rpc("match_material_chunks", { query_embedding: toPgVector(vector), p_material_id: materialId, k });
  if (error) throw error;
  return (data ?? []) as FoundChunk[];
}

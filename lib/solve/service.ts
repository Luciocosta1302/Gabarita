import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import { solvePhotoPrompt } from "@/lib/ai/prompts/solve-photo";
import { toAiJpeg } from "@/lib/images/resize";
import { searchChunks } from "@/lib/rag/search";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type MaterialMatch = { chunk_id: string; material_id: string; material_title: string; subject_name: string; page: number | null; preview: string; similarity: number };

/**
 * D11 — foto de uma questão: a IA (visão) transcreve e resolve passo a passo; depois buscamos no material
 * do aluno onde está a matéria (na matéria escolhida ou em todas).
 */
export async function solvePhoto(db: DB, input: { image: Uint8Array; subjectId?: string }) {
  const jpeg = await toAiJpeg(input.image);
  const { data: solution } = await generateJSON({ ...solvePhotoPrompt(), images: [{ mediaType: "image/jpeg", base64: jpeg.toString("base64") }] });
  if (!solution.readable) return { solution, matches: [] as MaterialMatch[] };

  let subjects: { id: string; name: string }[];
  if (input.subjectId) {
    const { data } = await db.from("subjects").select("id, name").eq("id", input.subjectId);
    subjects = data ?? [];
  } else {
    const { data } = await db.from("subjects").select("id, name").order("created_at", { ascending: false }).limit(10);
    subjects = data ?? [];
  }
  const found = (
    await Promise.all(
      subjects.map(async (s) => (await searchChunks(db, s.id, solution.subject_query, 3)).map((c) => ({ ...c, subject_name: s.name }))),
    )
  )
    .flat()
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);

  const ids = [...new Set(found.map((f) => f.material_id))];
  const { data: mats } = ids.length ? await db.from("materials").select("id, title").in("id", ids) : { data: [] };
  const title = new Map((mats ?? []).map((m) => [m.id, m.title]));
  const matches: MaterialMatch[] = found.map((f) => ({
    chunk_id: f.id,
    material_id: f.material_id,
    material_title: title.get(f.material_id) ?? "Material",
    subject_name: f.subject_name,
    page: f.page,
    preview: f.content.replace(/\s+/g, " ").slice(0, 220),
    similarity: f.similarity,
  }));
  return { solution, matches };
}

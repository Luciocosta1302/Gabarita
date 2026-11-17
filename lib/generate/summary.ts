import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import type { SourceChunk } from "@/lib/ai/prompts/sources";
import { summaryMergePrompt, summaryPrompt, type Summary } from "@/lib/ai/prompts/summary";
import { UserFacingError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

/** ~15k tokens por chamada; material maior é resumido em partes e depois juntado. */
const MAX_CHARS_PER_CALL = 60_000;

export function groupByChars<T extends { content: string }>(items: T[], max: number): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const it of items) {
    if (current.length && size + it.content.length > max) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push(it);
    size += it.content.length;
  }
  if (current.length) groups.push(current);
  return groups;
}

export async function generateSummary(supabase: DB, userId: string, materialId: string) {
  const { data: material } = await supabase
    .from("materials")
    .select("id, subject_id, title, status, page_count")
    .eq("id", materialId)
    .maybeSingle();
  if (!material) throw new UserFacingError("Material não encontrado.");
  if (material.status !== "ready") throw new UserFacingError("Espere o material terminar de processar.");

  const { data: chunks } = await supabase
    .from("chunks")
    .select("id, page, page_breaks, content")
    .eq("material_id", materialId)
    .order("chunk_index")
    .limit(5000);
  if (!chunks?.length) throw new UserFacingError("O material não tem texto para resumir.");

  const groups = groupByChars<SourceChunk>(chunks, MAX_CHARS_PER_CALL);
  let summary: Summary;
  if (groups.length === 1) {
    ({ data: summary } = await generateJSON(summaryPrompt({ title: material.title, chunks: groups[0] })));
  } else {
    const partials = await Promise.all(
      groups.map(async (g) => (await generateJSON(summaryPrompt({ title: material.title, chunks: g, partial: true }))).data),
    );
    ({ data: summary } = await generateJSON(summaryMergePrompt({ title: material.title, partials })));
  }

  // Páginas citadas só valem se existirem no material.
  const maxPage = material.page_count ?? Infinity;
  summary.sections = summary.sections.map((s) => ({
    ...s,
    pages: [...new Set(s.pages)].filter((p) => p >= 1 && p <= maxPage).sort((a, b) => a - b),
  }));

  const { error } = await supabase
    .from("summaries")
    .upsert(
      { user_id: userId, subject_id: material.subject_id, material_id: materialId, content_json: summary },
      { onConflict: "material_id" },
    );
  if (error) throw error;
  return summary;
}

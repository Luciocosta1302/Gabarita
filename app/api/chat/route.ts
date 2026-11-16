import { NextResponse } from "next/server";

import { generateJSON } from "@/lib/ai/provider";
import { chatPrompt } from "@/lib/ai/prompts/chat";
import { sourceAt } from "@/lib/ai/prompts/sources";
import { apiRoute, jsonError } from "@/lib/api/route";
import { searchChunks, searchMaterialChunks } from "@/lib/rag/search";
import { chatRequestSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

export type Citation = { n: number; chunk_id: string; material_id: string; material_title: string; page: number | null };
export type ChatResponse = { answer: string; has_basis: boolean; citations: Citation[] };

/** Chat com o material (RAG): busca os trechos parecidos e responde citando página/trecho. */
export const POST = apiRoute(chatRequestSchema, async (input, { supabase }) => {
  const { data: subject } = await supabase.from("subjects").select("id").eq("id", input.subject_id).maybeSingle();
  if (!subject) return jsonError("Matéria não encontrada.", 404);

  if (input.material_id) {
    const { data: m } = await supabase.from("materials").select("id").eq("id", input.material_id).eq("subject_id", input.subject_id).maybeSingle();
    if (!m) return jsonError("Material não encontrado.", 404);
  }
  const chunks = input.material_id
    ? await searchMaterialChunks(supabase, input.material_id, input.message, 8)
    : await searchChunks(supabase, input.subject_id, input.message, 8);
  const { data } = await generateJSON(chatPrompt({ question: input.message, history: input.history, chunks }));

  const used = [...new Set(data.sources)].map((n) => ({ n, chunk: sourceAt(chunks, n) })).filter((x) => x.chunk);
  const materialIds = [...new Set(used.map((u) => u.chunk!.material_id))];
  const { data: materials } = materialIds.length
    ? await supabase.from("materials").select("id, title").in("id", materialIds)
    : { data: [] };
  const titles = new Map((materials ?? []).map((m) => [m.id, m.title]));

  const body: ChatResponse = {
    answer: data.answer,
    has_basis: data.has_basis && used.length > 0,
    citations: used.map(({ n, chunk }) => ({
      n,
      chunk_id: chunk!.id,
      material_id: chunk!.material_id,
      material_title: titles.get(chunk!.material_id) ?? "Material",
      page: chunk!.page,
    })),
  };
  return NextResponse.json(body);
});

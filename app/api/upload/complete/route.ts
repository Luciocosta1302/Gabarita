import { after, NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";

export const maxDuration = 300;

/** O navegador terminou de enviar os arquivos: confere e enfileira o processamento. */
export const POST = apiRoute(z.object({ material_id: z.uuid() }), async ({ material_id }, { supabase, user }) => {
  const { data: material } = await supabase
    .from("materials")
    .select("id, status, storage_path, type")
    .eq("id", material_id)
    .maybeSingle();
  if (!material?.storage_path) return jsonError("Material não encontrado.", 404);
  if (material.status !== "pending") return NextResponse.json({ ok: true });

  const { data: files } = await supabase.storage.from(MATERIALS_BUCKET).list(material.storage_path);
  if (!files?.length) return jsonError("Nenhum arquivo foi enviado.", 400);

  const kind = material.type === "past_exam" ? "analyze_past_exam" : "ingest_material";
  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("payload_json->>material_id", material_id);
  if (!count) await enqueueJob(supabase, user.id, kind, { material_id });

  after(() => runJobs({ userId: user.id }));
  return NextResponse.json({ ok: true });
});

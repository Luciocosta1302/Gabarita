import { after, NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** "Tentar de novo" num material que deu erro: volta para a fila de processamento. */
export const POST = apiRoute(
  z.object({ material_id: z.uuid() }),
  async ({ material_id }, { supabase, user }) => {
    // RLS: só encontra se o material é do aluno
    const { data: m } = await supabase.from("materials").select("id, status, type, storage_path, source_url").eq("id", material_id).maybeSingle();
    if (!m) return jsonError("Material não encontrado. Ele pode ter sido apagado; envie de novo.", 404);
    if (m.status !== "error") return NextResponse.json({ ok: true });
    if (!m.storage_path && !m.source_url) return jsonError("O arquivo deste material não chegou ao servidor. Apague e envie de novo.", 400);

    const admin = createAdminClient();
    await admin.from("materials").update({ status: "pending", error: null }).eq("id", material_id);
    await enqueueJob(supabase, user.id, m.type === "past_exam" ? "analyze_past_exam" : "ingest_material", { material_id });
    after(() => runJobs({ userId: user.id }));
    return NextResponse.json({ ok: true });
  },
  { ai: true },
);

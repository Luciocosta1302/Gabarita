import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { isUserFacing } from "@/lib/errors";
import { createErrorFollowup } from "@/lib/generate/error-followup";
import { ingestMaterial, markMaterialFailed } from "@/lib/ingest/pipeline";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Fila de jobs na tabela `jobs`. Quem cria o job é a rota do usuário (RLS);
 * quem processa é o servidor com service role, via `after()` logo depois da requisição
 * ou pelo cron em /api/jobs/process.
 */

const MAX_ATTEMPTS = 3;

const JOBS = {
  ingest_material: {
    payload: z.object({ material_id: z.uuid() }),
    run: (admin: AdminClient, p: { material_id: string }) => ingestMaterial(admin, p.material_id),
    onFail: (admin: AdminClient, p: { material_id: string }, message: string) =>
      markMaterialFailed(admin, p.material_id, message),
  },
  error_followup: {
    payload: z.object({ notebook_id: z.uuid() }),
    run: (admin: AdminClient, p: { notebook_id: string }) => createErrorFollowup(admin, p.notebook_id),
    onFail: async (admin: AdminClient, p: { notebook_id: string }) => {
      await admin.from("error_notebook").update({ followup_status: "error" }).eq("id", p.notebook_id);
    },
  },
} as const;

export type JobKind = keyof typeof JOBS;
type Payload<K extends JobKind> = z.infer<(typeof JOBS)[K]["payload"]>;

/** Enfileira um job como o usuário logado. */
export async function enqueueJob<K extends JobKind>(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: K,
  payload: Payload<K>,
) {
  const { data, error } = await supabase
    .from("jobs")
    .insert({ user_id: userId, kind, payload_json: payload })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao criar job");
  return data.id;
}

const GENERIC_ERROR = "Algo deu errado ao processar. Tente de novo mais tarde.";

/**
 * Processa jobs da fila até acabar (ou até `max`). `userId` limita aos jobs de um usuário
 * (usado quando o próprio aluno "cutuca" a fila pela tela).
 */
export async function runJobs({ userId, max = 20 }: { userId?: string; max?: number } = {}) {
  const admin = createAdminClient();
  let processed = 0;
  while (processed < max) {
    const { data: jobs, error } = await admin.rpc("claim_jobs", { n: 1, p_user_id: userId });
    if (error) throw error;
    const job = jobs?.[0];
    if (!job) break;
    processed++;
    await runOne(admin, job);
  }
  return processed;
}

async function runOne(admin: AdminClient, job: Database["public"]["Tables"]["jobs"]["Row"]) {
  const def = JOBS[job.kind as JobKind];
  if (!def) {
    await admin.from("jobs").update({ status: "error", error: `Tipo de job desconhecido: ${job.kind}` }).eq("id", job.id);
    return;
  }
  const parsed = def.payload.safeParse(job.payload_json);
  if (!parsed.success) {
    await admin.from("jobs").update({ status: "error", error: "Payload inválido" }).eq("id", job.id);
    return;
  }
  const payload = parsed.data as never;
  try {
    await def.run(admin, payload);
    await admin.from("jobs").update({ status: "done", error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
  } catch (e) {
    const permanent = isUserFacing(e);
    const final = permanent || job.attempts >= MAX_ATTEMPTS;
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[jobs] ${job.kind} ${job.id} falhou (tentativa ${job.attempts}):`, message);
    await admin
      .from("jobs")
      .update({ status: final ? "error" : "queued", error: message, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    if (final) await def.onFail(admin, payload, permanent ? message : GENERIC_ERROR);
  }
}

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runJobs } from "@/lib/jobs/queue";
import { getUser } from "@/lib/supabase/server";

export const maxDuration = 300;

/**
 * Processa a fila de jobs.
 * - Cron (Vercel Cron, pg_cron...): `Authorization: Bearer <JOBS_SECRET>` → processa a fila toda.
 * - Aluno logado (a tela chama quando algo está demorando): processa só os jobs dele.
 */
/** Compara em tempo constante (não dá para adivinhar o segredo medindo o tempo da resposta). */
function sameSecret(given: string | null, secret: string) {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request) {
  const secret = process.env.JOBS_SECRET || process.env.CRON_SECRET;
  if (secret && sameSecret(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ processed: await runJobs({ max: 50 }) });
  }
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ processed: await runJobs({ userId: user.id, max: 5 }) });
}

export const GET = handle;
export const POST = handle;

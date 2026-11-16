import { NextResponse } from "next/server";

import { TIME_ZONE } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDaily } from "@/lib/whatsapp/service";

export const maxDuration = 300;

/** Cron de hora em hora (Authorization: Bearer JOBS_SECRET/CRON_SECRET): convites das 5 questões do dia. */
async function handle(req: Request) {
  const secret = process.env.JOBS_SECRET || process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hour12: false }).format(new Date())) % 24;
  return NextResponse.json({ hour, invited: await runDaily(createAdminClient(), hour) });
}

export const GET = handle;
export const POST = handle;

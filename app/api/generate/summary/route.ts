import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { generateSummary } from "@/lib/generate/summary";
import { generateSummarySchema } from "@/lib/validation/generate";

export const maxDuration = 300;

export const POST = apiRoute(generateSummarySchema, async ({ material_id }, { supabase, user }) => {
  const summary = await generateSummary(supabase, user.id, material_id);
  return NextResponse.json({ summary }, { status: 201 });
}, { ai: true });

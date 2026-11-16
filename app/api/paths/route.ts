import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { createPath } from "@/lib/paths/service";
import { createPathSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** Cria uma trilha de aprendizagem (a IA monta as etapas a partir dos tópicos do material). */
export const POST = apiRoute(createPathSchema, async (input, { supabase, user }) => {
  const id = await createPath(supabase, user.id, input.subject_id, input.goal);
  return NextResponse.json({ path_id: id }, { status: 201 });
});

import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { solvePhoto } from "@/lib/solve/service";
import { solvePhotoSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** D11 — resolve a questão da foto e mostra onde a matéria está no material do aluno. */
export const POST = apiRoute(solvePhotoSchema, async (input, { supabase }) => {
  if (input.subject_id) {
    const { data } = await supabase.from("subjects").select("id").eq("id", input.subject_id).maybeSingle();
    if (!data) return jsonError("Matéria não encontrada.", 404);
  }
  const r = await solvePhoto(supabase, { image: new Uint8Array(Buffer.from(input.image_base64, "base64")), subjectId: input.subject_id });
  return NextResponse.json(r);
}, { ai: true });

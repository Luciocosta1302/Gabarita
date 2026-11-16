import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { assertPro } from "@/lib/billing/limits";
import { runFeynman } from "@/lib/feynman/service";
import { feynmanSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** D9 — Modo Feynman: explicação do aluno (texto ou áudio WAV em base64) comparada com o material. */
export const POST = apiRoute(feynmanSchema, async (input, { supabase, user }) => {
  await assertPro(supabase, user.id, "feynman");
  const r = await runFeynman(supabase, user.id, {
    topicId: input.topic_id,
    text: input.audio_base64 ? undefined : input.text,
    audio: input.audio_base64 ? new Uint8Array(Buffer.from(input.audio_base64, "base64")) : undefined,
  });
  return NextResponse.json(r, { status: 201 });
});

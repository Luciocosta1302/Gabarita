import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { chatClearSchema } from "@/lib/validation/generate";

/** Apaga a conversa (da matéria ou do documento). */
export const POST = apiRoute(chatClearSchema, async (input, { supabase }) => {
  let q = supabase.from("chat_messages").delete().eq("subject_id", input.subject_id);
  q = input.material_id ? q.eq("material_id", input.material_id) : q.is("material_id", null);
  const { error } = await q;
  if (error) throw error;
  return NextResponse.json({ ok: true });
});

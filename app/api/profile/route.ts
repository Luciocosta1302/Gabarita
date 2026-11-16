import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { profileSchema } from "@/lib/validation/generate";

/** Atualiza o nome do perfil. */
export const POST = apiRoute(profileSchema, async (input, { supabase, user }) => {
  const { error } = await supabase.from("profiles").update({ name: input.name }).eq("id", user.id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});

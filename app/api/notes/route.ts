import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { noteActionSchema } from "@/lib/validation/generate";

/** Anotações: criar, salvar (autosave) e apagar. O RLS garante que só o dono mexe. */
export const POST = apiRoute(noteActionSchema, async (input, { supabase, user }) => {
  if (input.action === "create") {
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, subject_id: input.subject_id ?? null, title: input.title })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  }
  if (input.action === "delete") {
    const { error } = await supabase.from("notes").delete().eq("id", input.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  }
  const patch: { title?: string; content?: string; subject_id?: string | null; updated_at: string } = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.content !== undefined) patch.content = input.content;
  if (input.subject_id !== undefined) patch.subject_id = input.subject_id;
  const { data, error } = await supabase.from("notes").update(patch).eq("id", input.id).select("updated_at").maybeSingle();
  if (error) throw error;
  if (!data) return jsonError("Anotação não encontrada.", 404);
  return NextResponse.json(data);
});

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export const INBOX_NAME = "Sem pasta";

/** A pasta "Sem pasta" do aluno (criada na primeira vez). Segura contra duas abas ao mesmo tempo. */
export async function ensureInbox(supabase: DB, userId: string): Promise<string> {
  const find = () => supabase.from("subjects").select("id").eq("inbox", true).maybeSingle();
  const { data: found } = await find();
  if (found) return found.id;
  const { data: created, error } = await supabase.from("subjects").insert({ user_id: userId, name: INBOX_NAME, inbox: true }).select("id").single();
  if (created) return created.id;
  if (error?.code === "23505") {
    const { data: again } = await find();
    if (again) return again.id;
  }
  throw error ?? new Error("Não foi possível criar a pasta.");
}

/** Cria uma pasta só com o nome (data da prova etc. ficam para depois). */
export async function createFolder(supabase: DB, userId: string, name: string): Promise<string> {
  const { data, error } = await supabase.from("subjects").insert({ user_id: userId, name }).select("id").single();
  if (error || !data) throw error ?? new Error("Não foi possível criar a pasta.");
  return data.id;
}

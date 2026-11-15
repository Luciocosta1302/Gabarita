import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

import type { Database } from "@/lib/supabase/database.types";

/** Lê .env.local (o Vitest não carrega sozinho). */
function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // sem .env.local: usa o ambiente
  }
}
loadEnv();

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function anon(): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, { auth: { persistSession: false } });
}

/** Cria um usuário novo e devolve um cliente logado como ele. */
export async function newUser(label: string) {
  const client = anon();
  const email = `${label}-${crypto.randomUUID()}@teste.gabarita.local`;
  const { data, error } = await client.auth.signUp({ email, password: "senha-forte-123", options: { data: { name: label } } });
  if (error || !data.user) throw error ?? new Error("signUp falhou");
  return { client, user: data.user, email };
}

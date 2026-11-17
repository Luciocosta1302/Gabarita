"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, safeNext, signupSchema } from "@/lib/validation/auth";

/** `email`/`name` voltam para o formulário: o React 19 limpa os campos depois do envio. */
export type AuthState = { error?: string; message?: string; email?: string; name?: string };

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstFieldError(parsed.error), email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "E-mail ou senha incorretos.", email };

  redirect(safeNext(parsed.data.next));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const kept = { email: String(formData.get("email") ?? ""), name: String(formData.get("name") ?? "") };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstFieldError(parsed.error), ...kept };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name, terms_accepted_at: new Date().toISOString() },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  // mensagem genérica: não revela se o e-mail já tem conta (só a senha fraca é explicada)
  if (error) {
    const weak = error.code === "weak_password";
    return { error: weak ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra." : "Não foi possível criar a conta. Se você já tem conta, entre pelo login.", ...kept };
  }

  // Com confirmação de e-mail ligada (produção) não há sessão ainda.
  if (!data.session) return { message: "Enviamos um link de confirmação para o seu e-mail." };
  redirect("/dashboard");
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function firstFieldError(error: z.ZodError): string {
  const flat = z.flattenError(error);
  const fields = Object.values(flat.fieldErrors) as (string[] | undefined)[];
  return fields.find((m) => m && m.length > 0)?.[0] ?? flat.formErrors[0] ?? "Dados inválidos";
}

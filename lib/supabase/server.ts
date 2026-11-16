import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Cliente Supabase para Server Components, Server Actions e rotas de API (age como o usuário logado). */
export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();
  // em HTTPS os cookies de sessão só trafegam criptografados (Secure); SameSite=Lax vem do Supabase
  const secure = ((await headers()).get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, sameSite: "lax", secure }));
        } catch {
          // Chamado de um Server Component: o middleware cuida de renovar a sessão.
        }
      },
    },
  });
}

/** Retorna o usuário logado ou null. Use em toda rota/ação que exige login. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

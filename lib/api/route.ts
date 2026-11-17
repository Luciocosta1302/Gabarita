import "server-only";

import { explainStatus, SERVER_ERROR } from "./explain";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withUsage } from "@/lib/ai/usage";
import { isUserFacing } from "@/lib/errors";
import { getUser } from "@/lib/supabase/server";

type Ctx = Awaited<ReturnType<typeof getUser>> & { user: NonNullable<Awaited<ReturnType<typeof getUser>>["user"]> };

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Limites por aluno (janelas fixas). "ai" = rotas que chamam a IA (custo e cota do fornecedor). */
export const RATE_LIMITS = {
  general: [{ bucket: "api:min", limit: 120, windowS: 60 }],
  ai: [
    { bucket: "ai:min", limit: 15, windowS: 60 },
    { bucket: "ai:day", limit: 400, windowS: 86_400 },
  ],
} as const;

type Options = { ai?: boolean };

/**
 * Pedido de outro site (CSRF): o navegador manda o Origin; ele tem que ser o do próprio app.
 * (Os cookies de sessão já são SameSite=Lax; isto é uma segunda barreira.)
 */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // chamadas sem navegador (testes, curl) não mandam Origin e também não levam cookies de outro site
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Padrão de toda rota de API: confere a origem, exige login, aplica o limite de requisições,
 * valida o corpo (JSON) com Zod e transforma erros em respostas JSON (mensagem amigável quando é
 * UserFacingError; erro interno nunca vaza para o navegador).
 */
export function apiRoute<S extends z.ZodType>(schema: S, handler: (input: z.infer<S>, ctx: Ctx) => Promise<Response>, options: Options = {}) {
  return async (req: Request) => {
    if (!sameOrigin(req)) return jsonError(explainStatus(403), 403);
    if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return jsonError(explainStatus(415), 415);
    }
    const ctx = await getUser();
    if (!ctx.user) return jsonError(explainStatus(401), 401);

    for (const r of [...RATE_LIMITS.general, ...(options.ai ? RATE_LIMITS.ai : [])]) {
      const { data: ok, error } = await ctx.supabase.rpc("hit_rate_limit", { p_bucket: r.bucket, p_limit: r.limit, p_window_seconds: r.windowS });
      if (error) {
        console.error("[api] rate limit", error.message);
        break; // falha no contador não derruba o app
      }
      if (!ok) {
        return jsonError(
          r.bucket === "ai:day" ? "Você chegou ao limite de uso da IA por hoje. Volte amanhã." : "Muitas requisições em pouco tempo. Espere um minuto e tente de novo.",
          429,
        );
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Os dados chegaram incompletos. Recarregue a página e tente de novo.", 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first ? `${first.path.join(".") || "entrada"}: ${first.message}` : "Dados inválidos.", 400);
    }

    try {
      return await withUsage(ctx.user.id, () => handler(parsed.data, ctx as Ctx));
    } catch (e) {
      if (isUserFacing(e)) return jsonError(e.message, 422);
      if (e instanceof Error && (e as { rateLimited?: boolean }).rateLimited) return jsonError(e.message, 429);
      console.error("[api]", e);
      return jsonError(SERVER_ERROR, 500);
    }
  };
}

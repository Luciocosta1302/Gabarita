import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { isUserFacing } from "@/lib/errors";
import { getUser } from "@/lib/supabase/server";

type Ctx = Awaited<ReturnType<typeof getUser>> & { user: NonNullable<Awaited<ReturnType<typeof getUser>>["user"]> };

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Padrão de toda rota de API: exige login, valida o corpo com Zod e transforma
 * erros em respostas JSON (mensagem amigável quando é UserFacingError).
 */
export function apiRoute<S extends z.ZodType>(schema: S, handler: (input: z.infer<S>, ctx: Ctx) => Promise<Response>) {
  return async (req: Request) => {
    const ctx = await getUser();
    if (!ctx.user) return jsonError("Faça login para continuar.", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Corpo da requisição inválido.", 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first ? `${first.path.join(".") || "entrada"}: ${first.message}` : "Dados inválidos.", 400);
    }

    try {
      return await handler(parsed.data, ctx as Ctx);
    } catch (e) {
      if (isUserFacing(e)) return jsonError(e.message, 422);
      console.error("[api]", e);
      return jsonError("Algo deu errado. Tente de novo.", 500);
    }
  };
}

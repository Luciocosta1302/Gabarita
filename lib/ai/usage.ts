import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { todayBR } from "@/lib/dates";

import type { Usage } from "./types";

/**
 * Controle de custo (Fase 4): soma os tokens de IA usados durante uma requisição ou job e grava por
 * usuário/dia em `ai_usage`. Quem chama a IA não precisa fazer nada: `lib/ai/provider` registra sozinho.
 */
type Acc = { userId: string; calls: number; input: number; output: number };
const store = new AsyncLocalStorage<Acc>();

export function recordUsage(u: Usage) {
  const acc = store.getStore();
  if (!acc) return;
  acc.calls++;
  acc.input += u.inputTokens;
  acc.output += u.outputTokens;
}

export async function withUsage<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const acc: Acc = { userId, calls: 0, input: 0, output: 0 };
  return store.run(acc, async () => {
    try {
      return await fn();
    } finally {
      await flush(acc);
    }
  });
}

async function flush(acc: Acc) {
  if (acc.calls === 0) return;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().rpc("add_ai_usage", {
      p_user: acc.userId,
      p_day: todayBR(),
      p_calls: acc.calls,
      p_in: acc.input,
      p_out: acc.output,
    });
  } catch (e) {
    // contar uso nunca pode derrubar a funcionalidade
    console.error("[uso de IA] não foi possível registrar:", e instanceof Error ? e.message : e);
  }
}

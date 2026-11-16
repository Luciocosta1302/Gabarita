import "server-only";

import { createHash } from "node:crypto";

import { embed, getProvider } from "./provider";
import type { EmbedOptions } from "./types";

/**
 * Cache de embeddings (Fase 4): o mesmo texto não é enviado de novo à IA. A chave é um hash
 * (fornecedor + finalidade + texto), então a tabela não guarda o texto. Sem banco (testes de unidade),
 * cai direto no fornecedor.
 */
export async function cachedEmbed(texts: string[], opts?: EmbedOptions): Promise<number[][]> {
  const provider = getProvider();
  const keys = texts.map((t) => createHash("sha256").update(`${provider.name}:${opts?.purpose ?? "document"}:${t}`).digest("hex"));
  let admin: Awaited<ReturnType<typeof loadAdmin>> | null = null;
  try {
    admin = await loadAdmin();
  } catch {
    return embed(texts, opts);
  }

  const found = new Map<string, number[]>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data } = await admin.from("embedding_cache").select("key, embedding").in("key", keys.slice(i, i + 200));
    for (const row of data ?? []) found.set(row.key, JSON.parse(row.embedding as unknown as string) as number[]);
  }

  const missing = [...new Set(keys.map((k, i) => (found.has(k) ? -1 : i)).filter((i) => i >= 0))];
  if (missing.length) {
    const fresh = await embed(missing.map((i) => texts[i]), opts);
    const rows = missing.map((i, j) => ({ key: keys[i], embedding: `[${fresh[j].join(",")}]` }));
    missing.forEach((i, j) => found.set(keys[i], fresh[j]));
    await admin.from("embedding_cache").upsert(rows, { onConflict: "key", ignoreDuplicates: true });
  }
  return keys.map((k) => found.get(k)!);
}

async function loadAdmin() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

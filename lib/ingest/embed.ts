import "server-only";

import { embed } from "@/lib/ai/provider";

const BATCH = 100;

/** Gera embeddings em lotes (o fornecedor tem limite de itens por chamada). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) out.push(...(await embed(texts.slice(i, i + BATCH))));
  return out;
}

/** Formato que o pgvector aceita pela API do Supabase. */
export function toPgVector(v: number[]) {
  return `[${v.join(",")}]`;
}

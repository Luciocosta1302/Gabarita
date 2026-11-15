/** Escolha de trechos para gerar questões/flashcards. Função pura. */

/**
 * Escolhe `count` trechos espalhados pelo material, preferindo os que ainda não viraram questão.
 * Se houver menos trechos que `count`, devolve todos (a IA tira mais de uma questão por trecho).
 */
export function pickChunks<T extends { id: string }>(
  ordered: T[],
  used: Set<string>,
  count: number,
  rand: () => number = Math.random,
): T[] {
  if (ordered.length <= count) return ordered;
  const fresh = ordered.filter((c) => !used.has(c.id));
  const pool = fresh.length >= count ? fresh : ordered;
  const step = pool.length / count;
  const offset = rand() * step;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) picked.push(pool[Math.min(pool.length - 1, Math.floor(offset + i * step))]);
  return picked;
}

/** Divide `total` itens em lotes de no máximo `size`, com tamanhos parecidos. */
export function splitCounts(total: number, size: number): number[] {
  const n = Math.max(1, Math.ceil(total / size));
  return Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0));
}

/** Trecho do material passado para a IA. A IA cita pelo número [T#]; o código traduz de volta para o id. */
export type SourceChunk = { id: string; page: number | null; content: string };

export function formatSources(chunks: SourceChunk[]) {
  return chunks
    .map((c, i) => `[T${i + 1}]${c.page != null ? ` (página ${c.page})` : ""}\n${c.content.trim()}`)
    .join("\n\n---\n\n");
}

/** Converte o número do trecho citado (1-based) no trecho, ou null se a IA citou algo que não existe. */
export function sourceAt<T>(chunks: T[], n: number): T | null {
  return Number.isInteger(n) && n >= 1 && n <= chunks.length ? chunks[n - 1] : null;
}

/** Trecho do material passado para a IA. A IA cita pelo número [T#]; o código traduz de volta para o id. */
export type SourceChunk = { id: string; page: number | null; content: string; page_breaks?: unknown };

/**
 * `pageMarks`: marca dentro do texto onde começa cada página/slide (o trecho pode atravessar vários),
 * para a IA citar a página certa. Não usar onde a IA copia citações literais (as marcas não estão no material).
 */
export function formatSources(chunks: SourceChunk[], { pageMarks = false }: { pageMarks?: boolean } = {}) {
  return chunks
    .map((c, i) => {
      let text = c.content;
      const breaks = pageMarks && Array.isArray(c.page_breaks) ? (c.page_breaks as [number, number][]) : [];
      for (const [at, pg] of [...breaks].reverse()) text = `${text.slice(0, at)}\n[página ${pg}]\n${text.slice(at)}`;
      return `[T${i + 1}]${c.page != null ? ` (página ${c.page})` : ""}\n${text.trim()}`;
    })
    .join("\n\n---\n\n");
}

/** Converte o número do trecho citado (1-based) no trecho, ou null se a IA citou algo que não existe. */
export function sourceAt<T>(chunks: T[], n: number): T | null {
  return Number.isInteger(n) && n >= 1 && n <= chunks.length ? chunks[n - 1] : null;
}

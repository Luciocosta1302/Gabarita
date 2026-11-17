/**
 * Divide o texto em trechos de ~800 tokens com sobreposição de ~100 tokens.
 * Aproximação: 1 token ≈ 4 caracteres (bom o bastante para português; evita uma lib de tokenizer).
 * Cada trecho guarda a página onde começa e onde começam as páginas seguintes dentro dele.
 */

export type PageText = { page: number; text: string };
/** `breaks`: [posição no conteúdo, página] de cada página que começa dentro do trecho (além da primeira). */
export type Chunk = { index: number; page: number; content: string; breaks: [number, number][] };

export const CHARS_PER_TOKEN = 4;

export function approxTokens(text: string) {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Limpa o texto extraído: junta hifenização de fim de linha, tira espaços repetidos. */
export function cleanText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Procura um bom ponto de corte (fim de parágrafo > fim de frase > espaço) perto de `target`, sem passar de `max`. */
function cutPoint(text: string, start: number, target: number, max: number) {
  const window = text.slice(start, max);
  const minCut = Math.floor((target - start) * 0.6);
  for (const re of [/\n\n/g, /[.!?…](?=\s)/g, /\n/g, /\s/g]) {
    let best = -1;
    for (const m of window.matchAll(re)) {
      const pos = m.index + m[0].length;
      if (pos >= minCut && pos <= target - start) best = pos;
    }
    if (best > 0) return start + best;
  }
  return Math.min(target, text.length);
}

export function chunkPages(
  pages: PageText[],
  { maxTokens = 800, overlapTokens = 100 }: { maxTokens?: number; overlapTokens?: number } = {},
): Chunk[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;

  // Junta as páginas num texto só, lembrando onde cada página começa.
  let full = "";
  const starts: { offset: number; page: number }[] = [];
  for (const p of pages) {
    const t = cleanText(p.text);
    if (!t) continue;
    if (full) full += "\n\n";
    starts.push({ offset: full.length, page: p.page });
    full += t;
  }
  if (!full) return [];

  const pageAt = (offset: number) => {
    let page = starts[0].page;
    for (const s of starts) {
      if (s.offset <= offset) page = s.page;
      else break;
    }
    return page;
  };

  const chunks: Chunk[] = [];
  let start = 0;
  while (start < full.length) {
    // pula espaços no começo para o trecho não começar "vazio"
    while (start < full.length && /\s/.test(full[start])) start++;
    if (start >= full.length) break;

    const target = start + maxChars;
    const end = target >= full.length ? full.length : cutPoint(full, start, target, target);
    const content = full.slice(start, end).trim();
    if (content) {
      const breaks = starts.filter((s) => s.offset > start && s.offset < start + content.length).map((s) => [s.offset - start, s.page] as [number, number]);
      chunks.push({ index: chunks.length, page: pageAt(start), content, breaks });
    }
    if (end >= full.length) break;

    // volta `overlap` caracteres, alinhando no começo de uma palavra
    let next = Math.max(end - overlapChars, start + 1);
    while (next < end && !/\s/.test(full[next - 1])) next++;
    start = next;
  }
  return chunks;
}

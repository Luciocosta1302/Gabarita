/**
 * Páginas dentro de um trecho. Um trecho (~800 tokens) pode atravessar várias páginas/slides;
 * `page_breaks` guarda [posição no conteúdo, página] de cada página que começa depois do início.
 * Assim a questão aponta a página da citação, não só a página onde o trecho começa.
 */
import { findQuote } from "./quote";

export type PageBreaks = [number, number][];

function asBreaks(v: unknown): PageBreaks {
  if (!Array.isArray(v)) return [];
  return v.filter((b): b is [number, number] => Array.isArray(b) && b.length === 2 && b.every((n) => Number.isInteger(n)));
}

/** Página em que fica a posição `offset` do conteúdo do trecho. */
export function pageAtOffset(page: number | null, breaks: unknown, offset: number): number | null {
  let p = page;
  for (const [at, pg] of asBreaks(breaks)) {
    if (at <= offset) p = pg;
    else break;
  }
  return p;
}

/** Página onde a citação começa dentro do trecho (ou a página do trecho, se não achar). */
export function quotePage(chunk: { content: string; page: number | null; page_breaks?: unknown }, quote: string | null | undefined): number | null {
  if (!quote) return chunk.page;
  const range = findQuote(chunk.content, quote);
  return range ? pageAtOffset(chunk.page, chunk.page_breaks, range[0]) : chunk.page;
}

const words = (s: string) =>
  new Set(
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\d]{4,}/gu) ?? [],
  );

/**
 * Página do trecho que mais combina com um texto (ex.: a resposta do chat, que não traz citação literal):
 * conta as palavras do texto presentes em cada pedaço de página. Empate fica com a primeira.
 */
export function bestPageFor(chunk: { content: string; page: number | null; page_breaks?: unknown }, text: string): number | null {
  const breaks = asBreaks(chunk.page_breaks);
  if (breaks.length === 0) return chunk.page;
  const want = words(text);
  const cuts = [0, ...breaks.map(([at]) => at), chunk.content.length];
  const pages = [chunk.page, ...breaks.map(([, pg]) => pg)];
  let best = chunk.page;
  let bestScore = 0;
  for (let i = 0; i < pages.length; i++) {
    const seg = words(chunk.content.slice(cuts[i], cuts[i + 1]));
    let score = 0;
    for (const w of want) if (seg.has(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = pages[i];
    }
  }
  return best;
}

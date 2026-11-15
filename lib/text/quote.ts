/** Utilitários puros para citações (D1). Sem dependências: rodam no servidor e no navegador. */

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Aspas tipográficas e traços variam entre o PDF e a resposta da IA. */
function canonical(s: string) {
  return s
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, "-");
}

/**
 * Procura a citação dentro do conteúdo, ignorando diferenças de espaços/quebras de linha,
 * maiúsculas, aspas e pontuação nas pontas. Devolve [início, fim] no conteúdo original, ou null.
 */
export function findQuote(content: string, quote: string): [number, number] | null {
  const q = canonical(quote)
    .trim()
    .replace(/^[\s"'.,;:…-]+|[\s"'.,;:…-]+$/g, "");
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  // aspas/traço canônicos casam com as variantes tipográficas do conteúdo
  const pattern = words
    .map((w) =>
      escapeRegExp(w)
        .replace(/"/g, `["“”«»„]`)
        .replace(/'/g, `['‘’‚]`)
        .replace(/-/g, "[-–—]"),
    )
    .join("\\s+");
  const m = new RegExp(pattern, "iu").exec(content);
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Divide em frases e devolve uma frase "boa" (para mocks e prévias). */
export function pickSentence(text: string, seed = 0): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 20 && s.length <= 300);
  if (sentences.length === 0) return text.replace(/\s+/g, " ").trim().slice(0, 160);
  return sentences[seed % sentences.length];
}

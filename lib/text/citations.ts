/** Marcadores de citação que a IA escreve na resposta: [1], [1, 2], [T1], [T1, T3]. Sem dependências. */
export const CITATION_SPLIT = /(\[(?:T?\d+(?:\s*,\s*)?)+\])/g;

/** Números citados num marcador, ou null se o texto não é um marcador. */
export function citationNumbers(part: string): number[] | null {
  if (!/^\[(?:T?\d+(?:\s*,\s*)?)+\]$/.test(part)) return null;
  return part
    .slice(1, -1)
    .split(",")
    .map((x) => Number(x.trim().replace(/^T/, "")));
}

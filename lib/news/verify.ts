import type { NewsSummaryDraft } from "@/lib/ai/prompts/news";

/** Resumo depois da conferência: só o que tem comprovação literal no texto. */
export type CheckedSummary = {
  v: 2;
  points: { text: string; evidence: string }[];
  dates: { text: string; evidence: string }[];
  /** quantas frases foram descartadas por não estarem comprovadas no texto */
  dropped: number;
  /** resumo feito só com o trecho (o site não deixou ler o texto todo) */
  partial: boolean;
};

/** Normaliza para comparar: minúsculas, sem acento, aspas/traços iguais, espaços simples. */
export function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”«»"']/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Números (inclui datas tipo 12/12 e valores 1.500) que aparecem num texto. */
function numbers(s: string) {
  return (s.match(/\d+(?:[.,/:]\d+)*/g) ?? []).map((n) => n.replace(/[.,](?=\d{3}\b)/g, ""));
}

/**
 * Confere cada frase: o trecho citado precisa existir no texto (mínimo de 10 caracteres) e todo número
 * da frase precisa aparecer no texto. O que falhar é descartado.
 */
export function verifySummary(draft: NewsSummaryDraft, source: string, partial: boolean): CheckedSummary {
  const text = norm(source);
  const textNums = new Set(numbers(source).flatMap((n) => [n, n.replace(/^0+(?=\d)/, "")]));
  const ok = (p: { text: string; evidence: string }) => {
    const ev = norm(p.evidence);
    if (ev.length < 10 || !text.includes(ev)) return false;
    return numbers(p.text).every((n) => textNums.has(n) || textNums.has(n.replace(/^0+(?=\d)/, "")));
  };
  const points = draft.points.filter(ok);
  const dates = draft.dates.filter(ok);
  return { v: 2, points, dates, dropped: draft.points.length + draft.dates.length - points.length - dates.length, partial };
}

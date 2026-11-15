/** D7 — Medidor de falsa certeza. Funções puras. */

export const CONFIDENCE_LEVELS = ["chutei", "acho", "certeza"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  chutei: "Chutei",
  acho: "Acho que sei",
  certeza: "Tenho certeza",
};

export type ConfidenceStat = { level: Confidence; total: number; correct: number; wrongRate: number | null };

export function confidenceStats(attempts: { correct: boolean; confidence: string | null }[]): ConfidenceStat[] {
  return CONFIDENCE_LEVELS.map((level) => {
    const xs = attempts.filter((a) => a.confidence === level);
    const correct = xs.filter((a) => a.correct).length;
    return { level, total: xs.length, correct, wrongRate: xs.length ? (xs.length - correct) / xs.length : null };
  });
}

/** Frase principal do medidor: "Quando você tem certeza, erra X%". */
export function falseCertaintyMessage(stats: ConfidenceStat[]) {
  const sure = stats.find((s) => s.level === "certeza");
  if (!sure || sure.total === 0) return null;
  const pct = Math.round((sure.wrongRate ?? 0) * 100);
  return `Quando você marca "tenho certeza", erra ${pct}% das vezes (${sure.total - sure.correct} de ${sure.total}).`;
}

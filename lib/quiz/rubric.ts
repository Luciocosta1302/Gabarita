/** D10 — nota da discursiva a partir da rubrica. Função pura. */
import { RUBRIC_CRITERIA, type CriterionKey } from "@/lib/ai/prompts/open";

export const PASSING_SCORE = 6;

/** Média ponderada dos critérios (0–10, uma casa decimal). Critério ausente vale 0. */
export function rubricScore(criteria: { criterion: CriterionKey; score: number }[]) {
  const by = new Map(criteria.map((c) => [c.criterion, Math.max(0, Math.min(10, c.score))]));
  const total = RUBRIC_CRITERIA.reduce((s, c) => s + (by.get(c.key) ?? 0) * c.weight, 0) / 100;
  return Math.round(total * 10) / 10;
}

export function criterionLabel(key: string) {
  return RUBRIC_CRITERIA.find((c) => c.key === key)?.label ?? key;
}

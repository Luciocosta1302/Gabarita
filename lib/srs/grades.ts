/** Notas da revisão (sem dependências: vai para o navegador). */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const GRADE_LABELS: Record<ReviewGrade, string> = {
  again: "Errei",
  hard: "Difícil",
  good: "Bom",
  easy: "Fácil",
};

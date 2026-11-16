/** Trilhas de aprendizagem — regras puras (sem banco, sem IA). */
import type { GeneratedPath, Level } from "@/lib/ai/prompts/path";
import type { Difficulty } from "@/lib/ai/prompts/questions";

/** acertos seguidos para concluir uma etapa ("só avança quando entendeu") */
export const STREAK_TO_PASS = 2;
export const MAX_STEPS = 12;

export type StepStatus = "locked" | "available" | "in_progress" | "done";

export type PlannedStep = {
  position: number;
  title: string;
  objective: string;
  level: Level;
  /** índices (0-based) na lista de tópicos enviada à IA */
  topicIdx: number[];
  /** posições (1-based) de etapas anteriores */
  prerequisites: number[];
  status: StepStatus;
};

/**
 * Valida a trilha da IA: tópicos inexistentes saem, pré-requisitos só de etapas anteriores,
 * tópico esquecido vira etapa extra no fim, etapas sem tópico somem. Primeira etapa sempre liberada.
 */
export function normalizePath(path: GeneratedPath, topicCount: number): PlannedStep[] {
  const steps: Omit<PlannedStep, "position" | "status">[] = [];
  const oldToNew = new Map<number, number>();
  path.steps.forEach((s, i) => {
    const topicIdx = [...new Set(s.topics.map((t) => t - 1).filter((t) => t >= 0 && t < topicCount))];
    if (!topicIdx.length || steps.length >= MAX_STEPS) return;
    const prerequisites = [...new Set(s.prerequisites.map((p) => oldToNew.get(p)).filter((p): p is number => p != null))];
    steps.push({ title: s.title, objective: s.objective, level: s.level, topicIdx, prerequisites });
    oldToNew.set(i + 1, steps.length);
  });

  const covered = new Set(steps.flatMap((s) => s.topicIdx));
  for (let t = 0; t < topicCount && steps.length < MAX_STEPS + topicCount; t++) {
    if (covered.has(t)) continue;
    steps.push({
      title: "Etapa extra",
      objective: "Conhecer um assunto do material que ainda não entrou na trilha.",
      level: "intermediario",
      topicIdx: [t],
      prerequisites: steps.length ? [steps.length] : [],
    });
  }

  return steps.map((s, i) => ({ ...s, position: i + 1, status: s.prerequisites.length === 0 || i === 0 ? "available" : "locked" }));
}

/** Depois de concluir etapas, libera as que têm todos os pré-requisitos concluídos. */
export function unlockSteps<T extends { position: number; prerequisites: number[]; status: StepStatus }>(steps: T[]): T[] {
  const done = new Set(steps.filter((s) => s.status === "done").map((s) => s.position));
  return steps.map((s) =>
    s.status === "locked" && s.prerequisites.every((p) => done.has(p)) ? { ...s, status: "available" as const } : s,
  );
}

/** Dificuldade da próxima questão do tutor: errou → fácil; acertou → sobe conforme o nível da etapa. */
export function nextDifficulty(level: Level, lastCorrect: boolean | null, streak: number): Difficulty {
  if (lastCorrect === false) return "facil";
  if (level === "basico") return streak >= 1 ? "media" : "facil";
  if (level === "intermediario") return streak >= 1 ? "dificil" : "media";
  return streak >= 1 ? "dificil" : "media";
}

export type AnswerOutcome = { streak: number; passed: boolean };

export function applyAnswer(streak: number, correct: boolean): AnswerOutcome {
  const next = correct ? streak + 1 : 0;
  return { streak: next, passed: next >= STREAK_TO_PASS };
}

export function pathProgress(steps: { status: StepStatus }[]) {
  const done = steps.filter((s) => s.status === "done").length;
  return { done, total: steps.length, percent: steps.length ? Math.round((done / steps.length) * 100) : 0 };
}

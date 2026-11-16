import { describe, expect, it } from "vitest";

import { pathPrompt } from "@/lib/ai/prompts/path";
import { tutorDiagnosePrompt, tutorExplainPrompt } from "@/lib/ai/prompts/tutor";
import { GROUNDING_RULE } from "@/lib/ai/prompts/base";
import { applyAnswer, nextDifficulty, normalizePath, pathProgress, unlockSteps, type StepStatus } from "@/lib/paths/logic";

const step = (topics: number[], prerequisites: number[], title = "x") => ({
  title,
  objective: "Explicar algo.",
  level: "basico" as const,
  topics,
  prerequisites,
});

describe("normalizePath", () => {
  it("tópico inexistente sai; pré-requisito só de etapa anterior; primeira etapa liberada", () => {
    const steps = normalizePath({ title: "T", steps: [step([1, 9], [2]), step([2], [1, 3]), step([3], [2])] }, 3);
    expect(steps.map((s) => s.topicIdx)).toEqual([[0], [1], [2]]);
    expect(steps.map((s) => s.prerequisites)).toEqual([[], [1], [2]]);
    expect(steps.map((s) => s.status)).toEqual(["available", "locked", "locked"]);
  });

  it("etapa sem tópico válido some e os pré-requisitos são renumerados", () => {
    const steps = normalizePath({ title: "T", steps: [step([1], []), step([7], [1]), step([2], [1, 2])] }, 2);
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({ position: 2, topicIdx: [1], prerequisites: [1] });
  });

  it("tópico esquecido pela IA vira etapa extra no fim", () => {
    const steps = normalizePath({ title: "T", steps: [step([1], [])] }, 3);
    expect(steps.flatMap((s) => s.topicIdx).sort()).toEqual([0, 1, 2]);
    expect(steps[2].prerequisites).toEqual([2]);
  });

  it("etapa sem pré-requisito já nasce liberada", () => {
    const steps = normalizePath({ title: "T", steps: [step([1], []), step([2], [])] }, 2);
    expect(steps.map((s) => s.status)).toEqual(["available", "available"]);
  });
});

describe("liberação e domínio da etapa", () => {
  it("só libera quando todos os pré-requisitos estão concluídos", () => {
    const s = (position: number, prerequisites: number[], status: StepStatus) => ({ position, prerequisites, status });
    const out = unlockSteps([s(1, [], "done"), s(2, [1], "locked"), s(3, [1, 2], "locked")]);
    expect(out.map((x) => x.status)).toEqual(["done", "available", "locked"]);
    expect(pathProgress(out)).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("2 acertos seguidos concluem; erro zera a sequência", () => {
    expect(applyAnswer(0, true)).toEqual({ streak: 1, passed: false });
    expect(applyAnswer(1, true)).toEqual({ streak: 2, passed: true });
    expect(applyAnswer(1, false)).toEqual({ streak: 0, passed: false });
  });

  it("depois de errar, questão mais fácil; acertando, sobe", () => {
    expect(nextDifficulty("avancado", false, 0)).toBe("facil");
    expect(nextDifficulty("basico", null, 0)).toBe("facil");
    expect(nextDifficulty("basico", true, 1)).toBe("media");
    expect(nextDifficulty("intermediario", true, 1)).toBe("dificil");
  });
});

describe("prompts da trilha e do tutor", () => {
  const chunks = [{ id: "c1", page: 3, content: "A mitose produz duas células-filhas idênticas. Ela ocorre em células somáticas." }];

  it("mocks passam no próprio schema e todos usam só o material", () => {
    const prompts = [
      pathPrompt({ subjectName: "Bio", goal: "passar", topics: [{ name: "A", summary: null, mastery: 0.2 }, { name: "B", summary: "b", mastery: null }] }),
      tutorExplainPrompt({ stepTitle: "Mitose", objective: "Explicar", level: "basico", chunks }),
      tutorExplainPrompt({ stepTitle: "Mitose", objective: "Explicar", level: "basico", chunks, difficulty: "confundiu com meiose" }),
      tutorDiagnosePrompt({ stem: "?", options: ["a", "b"], correct: "a", chosen: "b", explanation: null, source: null }),
    ];
    for (const p of prompts) {
      expect(p.schema.safeParse(p.mock()).success).toBe(true);
      expect(p.system).toContain(GROUNDING_RULE);
    }
  });

  it("explicação depois de erro pede outro jeito, focando na dificuldade", () => {
    const p = tutorExplainPrompt({ stepTitle: "Mitose", objective: "Explicar", level: "basico", chunks, difficulty: "confundiu com meiose" });
    expect(p.prompt).toContain("DE OUTRO JEITO");
    expect(p.prompt).toContain("confundiu com meiose");
  });

  it("trilha do mock: uma etapa por tópico, encadeadas", () => {
    const p = pathPrompt({ subjectName: "Bio", goal: "passar", topics: [{ name: "A", summary: null, mastery: null }, { name: "B", summary: null, mastery: null }] });
    const steps = normalizePath(p.mock(), 2);
    expect(steps.map((s) => s.prerequisites)).toEqual([[], [1]]);
  });
});

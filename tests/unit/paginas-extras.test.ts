import { describe, expect, it } from "vitest";

import { recommendations, weeklySeries, weekStartOf } from "@/lib/performance/stats";

describe("desempenho", () => {
  it("semana começa na segunda", () => {
    expect(weekStartOf("2026-11-19")).toBe("2026-11-16"); // quinta → segunda
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16");
    expect(weekStartOf("2026-11-22")).toBe("2026-11-16"); // domingo
  });
  it("série das últimas semanas com aproveitamento", () => {
    const s = weeklySeries(
      [
        { correct: true, created_at: "2026-11-18T15:00:00Z", confidence: null },
        { correct: false, created_at: "2026-11-17T15:00:00Z", confidence: null },
        { correct: true, created_at: "2026-11-10T15:00:00Z", confidence: null },
        { correct: true, created_at: "2025-01-01T15:00:00Z", confidence: null },
      ],
      "2026-11-19",
      3,
    );
    expect(s.map((w) => w.weekStart)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(s.map((w) => [w.answered, w.accuracy])).toEqual([[0, null], [1, 1], [2, 0.5]]);
  });
  it("recomendações priorizam revisão, plano e tópicos fracos", () => {
    const r = recommendations({ weakTopics: [{ name: "Mitose", subjectId: "s", mastery: 0.2 }], dueReviews: 3, pendingToday: 2, sureWrongRate: 0.4, sureTotal: 10, answered: 50 });
    expect(r.map((x) => x.kind)).toEqual(["review", "plan", "weak", "certainty"]);
    expect(recommendations({ weakTopics: [], dueReviews: 0, pendingToday: 0, sureWrongRate: null, sureTotal: 0, answered: 0 })[0].kind).toBe("start");
  });
});

describe("conquistas", async () => {
  const { evaluate, levelOf, xpOf } = await import("@/lib/achievements/badges");
  const zero = { answered: 0, correct: 0, streak: 0, focusMinutes: 0, materials: 0, errorsResolved: 0, simulados: 0, stepsDone: 0, feynman: 0, journal: 0, rooms: 0, flashcardReviews: 0, community: 0 };
  it("níveis: 100, 300, 600 XP", () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(300).level).toBe(3);
    expect(levelOf(450).progress).toBeCloseTo(0.5);
  });
  it("XP e medalhas a partir dos números", () => {
    const c = { ...zero, answered: 100, correct: 60, streak: 3 };
    expect(xpOf(c)).toBe(100 * 2 + 60 * 3);
    const got = evaluate(c).filter((b) => b.unlocked).map((b) => b.name);
    expect(got).toEqual(expect.arrayContaining(["Primeiro passo", "Centena", "Mira boa", "Embalo"]));
    expect(got).not.toContain("Uma semana");
    expect(evaluate(zero).every((b) => !b.unlocked && b.progress === 0)).toBe(true);
  });
});

describe("anotações: markdown simples", async () => {
  const { parseBlocks } = await import("@/lib/notes/parse");
  it("títulos, listas, citação e parágrafos", () => {
    const b = parseBlocks("# Mitose\n- prófase\n- metáfase\n\n1. um\n2. dois\n> citação\nlinha 1\nlinha 2");
    expect(b.map((x) => x.kind)).toEqual(["h", "ul", "ol", "quote", "p"]);
    expect(b[1]).toEqual({ kind: "ul", items: ["prófase", "metáfase"] });
    expect(b[4]).toEqual({ kind: "p", text: "linha 1\nlinha 2" });
  });
  it("não interpreta HTML", () => {
    expect(parseBlocks("<script>x</script>")).toEqual([{ kind: "p", text: "<script>x</script>" }]);
  });
});

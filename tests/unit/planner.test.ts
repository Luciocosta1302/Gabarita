import { describe, expect, it } from "vitest";

import { addDays, daysBetween, todayBR } from "@/lib/dates";
import { autoReplan, buildPlan, markDone, markMissed, regenerateFrom, type PlanDay } from "@/lib/planner/plan";
import { topicMastery } from "@/lib/topics/mastery";

const today = "2026-11-16";
const exam = addDays(today, 14);
const topics = ["Citologia", "Genética", "Ecologia", "Evolução", "Fisiologia"].map((name, i) => ({
  id: `t${i}`,
  name,
  weight: 3 + i,
  mastery: null,
}));
const pending = (days: PlanDay[]) => days.flatMap((d) => d.tasks.filter((t) => !t.done && t.kind !== "review"));
const load = (d: PlanDay) => d.tasks.reduce((s, t) => s + t.minutes, 0);

describe("datas", () => {
  it("hoje no fuso de São Paulo", () => {
    expect(todayBR(new Date("2026-11-17T02:00:00Z"))).toBe("2026-11-16"); // 23h em SP
  });
  it("soma e diferença de dias", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(daysBetween("2026-11-16", "2026-11-30")).toBe(14);
  });
});

describe("buildPlan", () => {
  it("prova daqui 14 dias → 14 dias de plano, de hoje até a véspera", () => {
    const days = buildPlan({ today, examDate: exam, minutesPerDay: 120, topics });
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe(today);
    expect(days.at(-1)!.date).toBe(addDays(exam, -1));
    expect(days.every((d) => d.status === "pending" && d.tasks.length > 0)).toBe(true);
  });

  it("todo tópico é estudado e praticado; revisitas vêm depois; simulado na véspera", () => {
    const days = buildPlan({ today, examDate: exam, minutesPerDay: 120, topics });
    for (const t of topics) {
      const studyDay = days.findIndex((d) => d.tasks.some((x) => x.kind === "study" && x.topic_id === t.id));
      const qDay = days.findIndex((d) => d.tasks.some((x) => x.kind === "questions" && x.topic_id === t.id));
      const revisits = days.flatMap((d, i) => d.tasks.filter((x) => x.kind === "revisit" && x.topic_id === t.id).map(() => i));
      expect(studyDay).toBeGreaterThanOrEqual(0);
      expect(qDay).toBeGreaterThanOrEqual(studyDay);
      expect(revisits.every((i) => i > qDay)).toBe(true);
    }
    expect(days.at(-1)!.tasks.some((t) => t.kind === "simulado")).toBe(true);
    expect(days.at(-2)!.tasks.some((t) => t.kind === "weak")).toBe(true);
    expect(days.every((d) => d.tasks.filter((t) => t.kind === "review").length === 1)).toBe(true);
  });

  it("respeita as horas por dia (com folga só para revisitas)", () => {
    const days = buildPlan({ today, examDate: exam, minutesPerDay: 120, topics });
    for (const d of days) expect(load(d)).toBeLessThanOrEqual(120 + 16);
  });

  it("tópico já dominado ganha menos tempo de estudo", () => {
    const t2 = [
      { id: "a", name: "A", weight: 5, mastery: 0.95 },
      { id: "b", name: "B", weight: 5, mastery: 0.1 },
    ];
    const days = buildPlan({ today, examDate: exam, minutesPerDay: 90, topics: t2 });
    const study = (tid: string) => days.flatMap((d) => d.tasks).filter((t) => t.kind === "study" && t.topic_id === tid).reduce((s, t) => s + t.minutes, 0);
    expect(study("b")).toBeGreaterThan(study("a"));
  });

  it("sem material: plano genérico começando por enviar o material", () => {
    const days = buildPlan({ today, examDate: exam, minutesPerDay: 60, topics: [] });
    expect(days).toHaveLength(14);
    expect(days[0].tasks.some((t) => t.kind === "upload")).toBe(true);
    expect(days[1].tasks.some((t) => t.kind === "questions")).toBe(true);
  });

  it("prova hoje ou no passado → sem plano; amanhã → 1 dia", () => {
    expect(buildPlan({ today, examDate: today, minutesPerDay: 60, topics })).toEqual([]);
    expect(buildPlan({ today, examDate: addDays(today, 1), minutesPerDay: 60, topics })).toHaveLength(1);
  });
});

describe("replanejamento", () => {
  const base = buildPlan({ today, examDate: exam, minutesPerDay: 120, topics });

  it("marcar um dia como não feito redistribui as tarefas para os dias seguintes", () => {
    const before = pending(base).length;
    const moved = base[0].tasks.filter((t) => t.kind !== "review").map((t) => t.id);
    const after = markMissed(base, today, 120);

    expect(after[0].status).toBe("missed");
    expect(after[0].tasks.filter((t) => t.kind !== "review")).toEqual([]);
    expect(pending(after).length).toBe(before); // nenhuma tarefa sumiu
    for (const tid of moved) {
      const where = after.findIndex((d) => d.tasks.some((t) => t.id === tid));
      expect(where).toBeGreaterThan(0);
      expect(after[where].tasks.find((t) => t.id === tid)!.moved_from).toBe(today);
    }
    // não entope a reta final
    expect(after.at(-1)!.tasks.filter((t) => t.moved_from)).toEqual([]);
  });

  it("tarefas já feitas no dia não mudam de lugar", () => {
    const withDone = base.map((d, i) => (i === 0 ? { ...d, tasks: d.tasks.map((t, j) => ({ ...t, done: j === 1 })) } : d));
    const doneId = withDone[0].tasks[1].id;
    const after = markMissed(withDone, today, 120);
    expect(after[0].tasks.some((t) => t.id === doneId)).toBe(true);
  });

  it("dia concluído não pode virar não feito", () => {
    const done = markDone(base, today);
    expect(markMissed(done, today, 120)[0].status).toBe("done");
  });

  it("ao abrir o plano dias depois, os dias que passaram se reorganizam sozinhos", () => {
    const later = addDays(today, 3);
    const { days, changed } = autoReplan(base, later, 120);
    expect(changed).toBe(true);
    expect(days.slice(0, 3).every((d) => d.status === "missed")).toBe(true);
    expect(pending(days).length).toBe(pending(base).length);
    expect(days.filter((d) => d.date < later).flatMap((d) => d.tasks).filter((t) => t.kind !== "review")).toEqual([]);
    expect(autoReplan(days, later, 120).changed).toBe(false);
  });

  it("refazer com tópicos novos mantém o passado e o que foi feito hoje", () => {
    const generic = buildPlan({ today, examDate: exam, minutesPerDay: 60, topics: [] });
    const doneToday = generic.map((d, i) => (i === 0 ? { ...d, tasks: d.tasks.map((t) => ({ ...t, done: t.kind === "upload" })) } : d));
    const regenerated = regenerateFrom(doneToday, { today, examDate: exam, minutesPerDay: 60, topics });
    expect(regenerated).toHaveLength(14);
    expect(regenerated[0].tasks.some((t) => t.kind === "upload" && t.done)).toBe(true);
    expect(regenerated.some((d) => d.tasks.some((t) => t.topic_id === "t0"))).toBe(true);
  });
});

describe("domínio por tópico (D8)", () => {
  const at = (correct: boolean, day: number, confidence: string | null = "acho") => ({
    correct,
    confidence,
    created_at: `2026-11-${String(day).padStart(2, "0")}T10:00:00Z`,
  });

  it("sem respostas → sem dados", () => {
    expect(topicMastery([])).toBeNull();
  });
  it("respostas recentes pesam mais", () => {
    const improving = topicMastery([at(false, 1), at(false, 2), at(true, 3), at(true, 4)])!;
    const worsening = topicMastery([at(true, 1), at(true, 2), at(false, 3), at(false, 4)])!;
    expect(improving).toBeGreaterThan(0.5);
    expect(worsening).toBeLessThan(0.5);
  });
  it("acerto chutado vale meio", () => {
    expect(topicMastery([at(true, 1, "chutei")])).toBe(0.5);
    expect(topicMastery([at(true, 1, "certeza")])).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import { mascotLine, weekSeals } from "@/lib/brand/mascot";
import { addDays } from "@/lib/dates";

const base = { hour: 10, hasSubjects: true, due: 0, tasksTotal: 0, tasksDone: 0, nextTask: null, nearest: null, streak: 0, studiedToday: false };

describe("o que o Daruma diz", () => {
  it("sem matéria: um olho só e convite para criar", () => {
    expect(mascotLine({ ...base, hasSubjects: false })).toMatchObject({ eyes: "um", mood: "feliz" });
  });
  it("plano completo comemora; prova perto vira foco; revisões vêm antes do resto", () => {
    expect(mascotLine({ ...base, tasksTotal: 3, tasksDone: 3 }).mood).toBe("comemorando");
    expect(mascotLine({ ...base, nearest: { name: "Física", daysLeft: 1 } }).text).toContain("É amanhã a prova de Física");
    expect(mascotLine({ ...base, due: 4, nextTask: "estudar tópico 1" }).text).toContain("4 revisões");
    expect(mascotLine({ ...base, due: 1 }).text).toContain("1 revisão ");
  });
  it("próximo passo e sequência", () => {
    expect(mascotLine({ ...base, nextTask: "fazer 10 questões", streak: 3 }).text).toBe("Próximo passo: fazer 10 questões. Não deixa a sequência de 3 dias cair!");
    expect(mascotLine({ ...base, hour: 23, nextTask: "x" }).mood).toBe("sonolento");
  });
});

describe("selos da semana", () => {
  it("7 dias até hoje, marcando os estudados", () => {
    const w = weekSeals(["2026-11-17", "2026-11-15"], "2026-11-17", addDays);
    expect(w).toHaveLength(7);
    expect(w[0].date).toBe("2026-11-11");
    expect(w.filter((d) => d.studied).map((d) => d.date)).toEqual(["2026-11-15", "2026-11-17"]);
    expect(w[6].today).toBe(true);
  });
});

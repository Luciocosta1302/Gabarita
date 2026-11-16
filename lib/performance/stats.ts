/** Desempenho — agregações puras (sem banco). */
import { addDays, todayBR } from "@/lib/dates";

export type PerfAttempt = { correct: boolean; created_at: string; confidence: string | null };
export type WeekPoint = { weekStart: string; answered: number; correct: number; accuracy: number | null };

/** Segunda-feira da semana (YYYY-MM-DD) de uma data. */
export function weekStartOf(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  return addDays(date, -dow);
}

/** Últimas `weeks` semanas (da mais antiga para a atual), com questões respondidas e aproveitamento. */
export function weeklySeries(attempts: PerfAttempt[], today: string, weeks = 8): WeekPoint[] {
  const current = weekStartOf(today);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(current, -7 * (weeks - 1 - i)));
  const by = new Map(starts.map((s) => [s, { answered: 0, correct: 0 }]));
  for (const a of attempts) {
    const w = by.get(weekStartOf(todayBR(new Date(a.created_at))));
    if (!w) continue;
    w.answered++;
    if (a.correct) w.correct++;
  }
  return starts.map((s) => {
    const w = by.get(s)!;
    return { weekStart: s, ...w, accuracy: w.answered ? w.correct / w.answered : null };
  });
}

export type Recommendation = { kind: "weak" | "review" | "plan" | "certainty" | "start"; text: string; href: string };

export function recommendations(input: {
  weakTopics: { name: string; subjectId: string; mastery: number }[];
  dueReviews: number;
  pendingToday: number;
  sureWrongRate: number | null;
  sureTotal: number;
  answered: number;
}): Recommendation[] {
  const out: Recommendation[] = [];
  if (input.answered === 0) out.push({ kind: "start", text: "Envie um material e faça suas primeiras questões.", href: "/dashboard" });
  if (input.dueReviews > 0) out.push({ kind: "review", text: `Você tem ${input.dueReviews} ${input.dueReviews === 1 ? "item" : "itens"} para revisar hoje.`, href: "/review" });
  if (input.pendingToday > 0) out.push({ kind: "plan", text: `Faltam ${input.pendingToday} ${input.pendingToday === 1 ? "tarefa" : "tarefas"} do plano de hoje.`, href: "/dashboard" });
  for (const t of input.weakTopics.slice(0, 3)) {
    out.push({ kind: "weak", text: `Reforce "${t.name}" (domínio ${Math.round(t.mastery * 100)}%).`, href: `/subjects/${t.subjectId}#dominio` });
  }
  if (input.sureTotal >= 5 && (input.sureWrongRate ?? 0) >= 0.25) {
    out.push({
      kind: "certainty",
      text: `Quando você tem certeza, erra ${Math.round((input.sureWrongRate ?? 0) * 100)}% — vale revisar o caderno de erros.`,
      href: "/errors",
    });
  }
  return out;
}

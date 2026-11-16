/** D16 — relatório do simulado. Função pura. */

export type ReportQuestion = { id: string; topicName: string | null };
export type ReportAttempt = { question_id: string; correct: boolean; time_ms: number | null };

export type SimuladoReport = {
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  percent: number;
  /** Cebraspe: cada errada anula uma certa; em branco não conta. */
  cebraspeNet: number | null;
  usedMs: number | null;
  limitMs: number;
  avgMsPerAnswered: number | null;
  timeByQuestion: { id: string; index: number; ms: number | null; correct: boolean | null }[];
  weakTopics: { name: string; correct: number; total: number }[];
};

export function simuladoReport(input: {
  questions: ReportQuestion[];
  attempts: ReportAttempt[];
  style: string | null;
  timeLimitS: number;
  startedAt: string | null;
  finishedAt: string | null;
}): SimuladoReport {
  const byQ = new Map(input.attempts.map((a) => [a.question_id, a]));
  const total = input.questions.length;
  const correct = input.attempts.filter((a) => a.correct).length;
  const wrong = input.attempts.filter((a) => !a.correct).length;
  const blank = total - correct - wrong;
  const limitMs = input.timeLimitS * 1000;
  const usedMs =
    input.startedAt && input.finishedAt
      ? Math.min(limitMs, Math.max(0, Date.parse(input.finishedAt) - Date.parse(input.startedAt)))
      : null;
  const times = input.attempts.map((a) => a.time_ms).filter((t): t is number => t != null);

  const topics = new Map<string, { correct: number; total: number }>();
  for (const q of input.questions) {
    if (!q.topicName) continue;
    const t = topics.get(q.topicName) ?? { correct: 0, total: 0 };
    t.total++;
    if (byQ.get(q.id)?.correct) t.correct++;
    topics.set(q.topicName, t);
  }
  const weakTopics = [...topics.entries()]
    .map(([name, t]) => ({ name, ...t }))
    .filter((t) => t.correct / t.total < 0.7)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .slice(0, 5);

  return {
    total,
    correct,
    wrong,
    blank,
    percent: total ? Math.round((correct / total) * 100) : 0,
    cebraspeNet: input.style === "cebraspe" ? correct - wrong : null,
    usedMs,
    limitMs,
    avgMsPerAnswered: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    timeByQuestion: input.questions.map((q, index) => {
      const a = byQ.get(q.id);
      return { id: q.id, index, ms: a?.time_ms ?? null, correct: a ? a.correct : null };
    }),
    weakTopics,
  };
}

export function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m ? `${m} min ${s % 60}s` : `${s}s`;
}

/** D8 — domínio por tópico (0–1). Função pura. */

export type MasteryAttempt = { correct: boolean; confidence: string | null; created_at: string };

const WINDOW = 10;
const DECAY = 0.85;

/**
 * Média ponderada das últimas 10 respostas do tópico (as mais recentes pesam mais).
 * Acerto "chutado" vale meio acerto. Sem respostas → null (sem dados, não 0%).
 */
export function topicMastery(attempts: MasteryAttempt[]): number | null {
  if (attempts.length === 0) return null;
  const recent = [...attempts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, WINDOW);
  let num = 0;
  let den = 0;
  recent.forEach((a, i) => {
    const w = DECAY ** i;
    num += w * (a.correct ? (a.confidence === "chutei" ? 0.5 : 1) : 0);
    den += w;
  });
  return num / den;
}

export function masteryLabel(m: number | null) {
  if (m == null) return "sem dados";
  if (m < 0.4) return "fraco";
  if (m < 0.7) return "em progresso";
  return "dominado";
}

/**
 * D3 — Repetição espaçada com FSRS (lib ts-fsrs). Funções puras: o estado do cartão vai para
 * `reviews.fsrs_state_json` (datas em ISO) e `reviews.due_at`.
 */
import { createEmptyCard, FSRS, Rating, type Card, type Grade } from "ts-fsrs";

export type FsrsState = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string | null };
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const GRADE_LABELS: Record<ReviewGrade, string> = {
  again: "Errei",
  hard: "Difícil",
  good: "Bom",
  easy: "Fácil",
};

const GRADES: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// 90% de chance de lembrar no dia da revisão; intervalo máximo de 1 ano (prova tem data).
const scheduler = new FSRS({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: false });

function toState(card: Card): FsrsState {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() ?? null };
}

function fromState(s: FsrsState): Card {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined };
}

/** Cartão novo: já vence agora (aparece em "Revisar hoje"). */
export function newCard(now = new Date()): { state: FsrsState; dueAt: string } {
  const card = createEmptyCard(now);
  return { state: toState(card), dueAt: card.due.toISOString() };
}

/** Aplica uma revisão e devolve o novo estado e quando o item volta. */
export function review(
  state: FsrsState | null | Record<string, never>,
  grade: ReviewGrade,
  now = new Date(),
): { state: FsrsState; dueAt: string } {
  const card = state && "due" in state && state.due ? fromState(state as FsrsState) : createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, GRADES[grade]);
  return { state: toState(next), dueAt: next.due.toISOString() };
}

/**
 * Nota FSRS a partir de uma resposta de questão + confiança (D7):
 * errou → "again"; acertou chutando → "hard"; achando → "good"; com certeza → "easy".
 */
export function gradeFromAttempt(correct: boolean, confidence: string | null | undefined): ReviewGrade {
  if (!correct) return "again";
  if (confidence === "chutei") return "hard";
  if (confidence === "certeza") return "easy";
  return "good";
}

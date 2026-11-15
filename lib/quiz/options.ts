/** Funções puras de questões de múltipla escolha. Sem dependências (servidor e navegador). */

export const LETTERS = ["A", "B", "C", "D", "E"] as const;

export function indexToLetter(i: number) {
  return LETTERS[i] ?? "?";
}

export function letterToIndex(letter: string) {
  return LETTERS.indexOf(letter.trim().toUpperCase() as (typeof LETTERS)[number]);
}

/**
 * Embaralha as alternativas e devolve onde a correta foi parar.
 * A IA tende a colocar a correta sempre na mesma posição; isso tira o padrão.
 */
export function shuffleOptions(options: string[], answerIndex: number, rand: () => number = Math.random) {
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), answerIndex: order.indexOf(answerIndex) };
}

/** Corrige no servidor: o navegador nunca recebe a resposta antes de responder. */
export function isCorrect(chosen: string, answer: string) {
  return letterToIndex(chosen) !== -1 && letterToIndex(chosen) === letterToIndex(answer);
}

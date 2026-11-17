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

/**
 * Posições da resposta certa para um lote de questões, espalhadas por igual (A, B, C, D... em ordem
 * aleatória). Só embaralhar cada questão pode, por azar, dar 7 de 10 na mesma letra; assim não dá.
 */
export function balancedPositions(sizes: number[], rand: () => number = Math.random): number[] {
  const max = Math.max(1, ...sizes);
  const pool: number[] = [];
  while (pool.length < sizes.length) {
    const round = Array.from({ length: max }, (_, i) => i);
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    pool.push(...round);
  }
  // cada questão pega uma posição que caiba nas alternativas dela
  return sizes.map((n, i) => (pool[i] < n ? pool[i] : Math.floor(rand() * n)));
}

/** Embaralha as alternativas pondo a correta na posição `target`. */
export function shuffleOptionsTo(options: string[], answerIndex: number, target: number, rand: () => number = Math.random) {
  const others = shuffleOptions(options.filter((_, i) => i !== answerIndex), -1, rand).options;
  const out = [...others.slice(0, target), options[answerIndex], ...others.slice(target)];
  return { options: out, answerIndex: target };
}

/** Corrige no servidor: o navegador nunca recebe a resposta antes de responder. */
export function isCorrect(chosen: string, answer: string) {
  return letterToIndex(chosen) !== -1 && letterToIndex(chosen) === letterToIndex(answer);
}

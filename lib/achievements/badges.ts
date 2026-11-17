/** Conquistas: calculadas a partir do que o aluno já fez (sem tabela própria). Funções puras. */

export type AchievementCounts = {
  answered: number;
  correct: number;
  streak: number;
  focusMinutes: number;
  materials: number;
  errorsResolved: number;
  simulados: number;
  stepsDone: number;
  feynman: number;
  journal: number;
  rooms: number;
  flashcardReviews: number;
  community: number;
};

export type Badge = {
  id: string;
  /** kanji do selo da medalha */
  icon: string;
  /** leitura e significado do kanji (mostrado como dica) */
  meaning: string;
  name: string;
  description: string;
  metric: keyof AchievementCounts;
  goal: number;
};

const tiers = (id: string, icon: string, metric: keyof AchievementCounts, items: [number, string, string][]): Badge[] =>
  items.map(([goal, name, description], i) => ({ id: `${id}-${i + 1}`, icon, meaning: KANJI_MEANING[icon] ?? "", name, description, metric, goal }));

const KANJI_MEANING: Record<string, string> = {
  問: "mon, pergunta",
  的: "mato, alvo",
  続: "zoku, continuar",
  茶: "cha, chá (pausa e foco)",
  書: "sho, livro",
  誤: "go, erro",
  試: "shi, prova",
  道: "michi, caminho",
  説: "setsu, explicar",
  記: "ki, registrar",
  友: "tomo, amigo",
  復: "fuku, voltar (revisar)",
  話: "wa, conversa",
};

export const BADGES: Badge[] = [
  ...tiers("questoes", "問", "answered", [
    [1, "Primeiro passo", "Responda sua primeira questão"],
    [100, "Centena", "Responda 100 questões"],
    [1000, "Maratonista", "Responda 1000 questões"],
  ]),
  ...tiers("acertos", "的", "correct", [
    [50, "Mira boa", "Acerte 50 questões"],
    [500, "Gabaritando", "Acerte 500 questões"],
  ]),
  ...tiers("sequencia", "続", "streak", [
    [3, "Embalo", "Estude 3 dias seguidos"],
    [7, "Uma semana", "Estude 7 dias seguidos"],
    [30, "Hábito formado", "Estude 30 dias seguidos"],
  ]),
  ...tiers("foco", "茶", "focusMinutes", [
    [25, "Primeiro pomodoro", "Complete 25 min de foco"],
    [600, "10 horas", "Acumule 10 h de foco"],
    [3000, "50 horas", "Acumule 50 h de foco"],
  ]),
  ...tiers("materiais", "書", "materials", [
    [1, "Biblioteca aberta", "Envie seu primeiro material"],
    [10, "Estante cheia", "Envie 10 materiais"],
  ]),
  ...tiers("erros", "誤", "errorsResolved", [
    [1, "Errar é aprender", "Resolva um erro do caderno"],
    [25, "Caderno limpo", "Resolva 25 erros do caderno"],
  ]),
  ...tiers("simulados", "試", "simulados", [
    [1, "Ensaio geral", "Entregue um simulado"],
    [10, "Ritmo de prova", "Entregue 10 simulados"],
  ]),
  ...tiers("trilhas", "道", "stepsDone", [
    [1, "Na trilha", "Conclua uma etapa de trilha"],
    [20, "Explorador", "Conclua 20 etapas de trilha"],
  ]),
  ...tiers("feynman", "説", "feynman", [[1, "Professor por um dia", "Explique um conceito no modo Feynman"]]),
  ...tiers("diario", "記", "journal", [
    [1, "Querido diário", "Faça um registro no diário"],
    [20, "Reflexivo", "Faça 20 registros no diário"],
  ]),
  ...tiers("turma", "友", "rooms", [[1, "Em grupo", "Entre ou crie uma turma"]]),
  ...tiers("revisao", "復", "flashcardReviews", [[50, "Memória de elefante", "Revise 50 itens da revisão espaçada"]]),
  ...tiers("comunidade", "話", "community", [
    [1, "Na comunidade", "Publique ou responda na comunidade"],
    [20, "Ajuda a turma toda", "Faça 20 posts ou respostas na comunidade"],
  ]),
];

export const XP = { answered: 2, correct: 3, focusMinutes: 1, materials: 20, errorsResolved: 10, simulados: 30, stepsDone: 25, feynman: 20, journal: 10, community: 5 } as const;

export function xpOf(c: AchievementCounts) {
  return (Object.keys(XP) as (keyof typeof XP)[]).reduce((s, k) => s + XP[k] * c[k], 0) + c.flashcardReviews;
}

/** Nível n exige 100·n·(n−1)/2 XP acumulado (100, 300, 600...). */
export function levelOf(xp: number) {
  let level = 1;
  while ((100 * (level + 1) * level) / 2 <= xp) level++;
  const floor = (100 * level * (level - 1)) / 2;
  const next = (100 * (level + 1) * level) / 2;
  return { level, xp, floor, next, progress: (xp - floor) / (next - floor) };
}

export function evaluate(c: AchievementCounts) {
  return BADGES.map((b) => ({ ...b, value: c[b.metric], unlocked: c[b.metric] >= b.goal, progress: Math.min(1, c[b.metric] / b.goal) }));
}

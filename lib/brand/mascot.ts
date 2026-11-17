/**
 * Quem da turma fala no Início e o que diz — uma frase curta e útil, conforme o dia do aluno (regras puras).
 * Mochi recebe e comemora; Daru cuida da prova, do plano e da sequência; Fuku chama para revisar.
 */

export type MascotLine =
  | { who: "mochi"; mood: "feliz" | "animada" | "pensando" | "dormindo" | "comemorando"; text: string }
  | { who: "daru"; mood: "feliz" | "animado" | "pensando" | "sonolento" | "comemorando"; eyes: "um" | "dois"; text: string }
  | { who: "fuku"; mood: "explicando" | "pensando" | "feliz" | "surpresa"; text: string };

export type MascotInput = {
  hour: number;
  hasSubjects: boolean;
  due: number;
  tasksTotal: number;
  tasksDone: number;
  nextTask: string | null;
  nearest: { name: string; daysLeft: number } | null;
  streak: number;
  studiedToday: boolean;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function mascotLine(i: MascotInput): MascotLine {
  if (!i.hasSubjects) {
    return {
      who: "mochi",
      mood: "animada",
      text: "Oi! Eu sou a Mochi. Mande seu primeiro arquivo no botão “Material”: ele vira uma conversa, e a gente estuda junto.",
    };
  }
  if (i.tasksTotal > 0 && i.tasksDone >= i.tasksTotal) {
    return { who: "mochi", mood: "comemorando", text: "Plano de hoje completo! Carimbei o seu dia. Descansar também é estudar." };
  }
  if (i.nearest && i.nearest.daysLeft <= 3) {
    const quando = i.nearest.daysLeft === 0 ? "É hoje" : i.nearest.daysLeft === 1 ? "É amanhã" : `Faltam ${i.nearest.daysLeft} dias`;
    return {
      who: "daru",
      mood: "pensando",
      eyes: "um",
      text: `${quando} a prova de ${i.nearest.name}. Foco no que você mais erra: o caderno de erros e a revisão vêm primeiro.`,
    };
  }
  if (i.due > 0) {
    return {
      who: "fuku",
      mood: "explicando",
      text: `Tem ${plural(i.due, "revisão", "revisões")} te esperando. Começa por elas: é o que segura a matéria na memória.`,
    };
  }
  if (i.hour >= 23 || i.hour < 5) {
    return { who: "mochi", mood: "dormindo", text: "Tá tarde… Uma revisão rápida e cama. Dormir bem fixa o que você estudou." };
  }
  if (i.nextTask) {
    const seq = i.streak > 1 && !i.studiedToday ? ` Não deixa a sequência de ${i.streak} dias cair!` : "";
    return { who: "daru", mood: "animado", eyes: "dois", text: `Próximo passo: ${i.nextTask}.${seq}` };
  }
  if (i.streak > 0 && !i.studiedToday) {
    return { who: "daru", mood: "pensando", eyes: "dois", text: `Você está há ${plural(i.streak, "dia", "dias")} seguidos. Um pomodoro hoje e o selo é seu.` };
  }
  return { who: "mochi", mood: "feliz", text: "Bora estudar um pouquinho? Um pomodoro de 25 minutos já conta." };
}

/** Os últimos 7 dias (do mais antigo para hoje), marcando os estudados. */
export function weekSeals(studyDates: Iterable<string>, today: string, addDays: (d: string, n: number) => string) {
  const set = new Set(studyDates);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, studied: set.has(date), today: i === 6 };
  });
}

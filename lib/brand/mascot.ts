/** O que o Daruma diz no Início — uma frase curta e útil, conforme o dia do aluno (regras puras). */

export type MascotLine = { mood: "feliz" | "animado" | "pensando" | "sonolento" | "comemorando"; eyes: "um" | "dois"; text: string };

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
      mood: "feliz",
      eyes: "um",
      text: "Oi! Eu sou o Daruma. Crie sua primeira matéria com a data da prova: eu pinto um olho agora e o outro quando você passar.",
    };
  }
  if (i.tasksTotal > 0 && i.tasksDone >= i.tasksTotal) {
    return { mood: "comemorando", eyes: "dois", text: "Plano de hoje completo! Carimbei o seu dia. Descansar também é estudar." };
  }
  if (i.nearest && i.nearest.daysLeft <= 3) {
    const quando = i.nearest.daysLeft === 0 ? "É hoje" : i.nearest.daysLeft === 1 ? "É amanhã" : `Faltam ${i.nearest.daysLeft} dias`;
    return {
      mood: "pensando",
      eyes: "um",
      text: `${quando} a prova de ${i.nearest.name}. Foco no que você mais erra: o caderno de erros e a revisão vêm primeiro.`,
    };
  }
  if (i.due > 0) {
    return {
      mood: "animado",
      eyes: "dois",
      text: `Tem ${plural(i.due, "revisão", "revisões")} te esperando. Começa por elas: é o que segura a matéria na memória.`,
    };
  }
  if (i.hour >= 23 || i.hour < 5) {
    return { mood: "sonolento", eyes: "dois", text: "Tá tarde… Uma revisão rápida e cama. Dormir bem fixa o que você estudou." };
  }
  if (i.nextTask) {
    const seq = i.streak > 1 && !i.studiedToday ? ` Não deixa a sequência de ${i.streak} dias cair!` : "";
    return { mood: "animado", eyes: "dois", text: `Próximo passo: ${i.nextTask}.${seq}` };
  }
  if (i.streak > 0 && !i.studiedToday) {
    return { mood: "pensando", eyes: "dois", text: `Você está há ${plural(i.streak, "dia", "dias")} seguidos. Um pomodoro hoje e o selo é seu.` };
  }
  return { mood: "feliz", eyes: "dois", text: "Bora estudar um pouquinho? Um pomodoro de 25 minutos já conta." };
}

/** Os últimos 7 dias (do mais antigo para hoje), marcando os estudados. */
export function weekSeals(studyDates: Iterable<string>, today: string, addDays: (d: string, n: number) => string) {
  const set = new Set(studyDates);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, studied: set.has(date), today: i === 6 };
  });
}

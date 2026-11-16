import { z } from "zod";

/** Diário de aprendizagem: acompanhamento da evolução a partir dos registros do aluno. */
export const journalReflectionSchema = z.object({
  summary: z.string().min(10).describe("Como foi o período, em 2-3 frases, falando com o aluno"),
  progress: z.array(z.string()).max(5).describe("Avanços concretos que aparecem nos registros e nos números"),
  recurring_difficulties: z.array(z.string()).max(5).describe("Dificuldades que se repetem"),
  mood_trend: z.string().describe("Como o humor/energia variou e o que isso sugere (1 frase)"),
  suggestions: z.array(z.string()).min(1).max(4).describe("Próximos passos práticos para a semana"),
  encouragement: z.string().describe("Uma frase curta de incentivo, sincera"),
});
export type JournalReflection = z.infer<typeof journalReflectionSchema>;

export type JournalInput = {
  entries: { date: string; mood: string; learned: string; difficulties: string | null; subject: string | null; focusMinutes: number | null }[];
  stats: { answered: number; accuracy: number | null; focusMinutes: number; streak: number };
};

const SYSTEM = [
  "Você é um mentor de estudos que acompanha um aluno brasileiro pelo diário de aprendizagem dele.",
  "Use APENAS os registros e os números fornecidos; não invente fatos, notas ou matérias. Se houver pouco registro, diga isso com gentileza.",
  "Seja específico (cite o que ele escreveu), acolhedor e prático. Nada de frases genéricas de autoajuda.",
  "Se perceber sinais de cansaço ou frustração repetidos, sugira pausas e um ritmo sustentável.",
  "Português do Brasil, falando diretamente com o aluno (você).",
].join("\n");

export function journalPrompt(input: JournalInput) {
  const entries = input.entries
    .map((e) => `- ${e.date}${e.subject ? ` [${e.subject}]` : ""} (humor: ${e.mood}${e.focusMinutes ? `, ${e.focusMinutes} min de foco` : ""})\n  Aprendi: ${e.learned}${e.difficulties ? `\n  Dificuldade: ${e.difficulties}` : ""}`)
    .join("\n");
  const s = input.stats;
  return {
    system: SYSTEM,
    prompt: `Números do período: ${s.answered} questões respondidas${s.accuracy != null ? `, ${Math.round(s.accuracy * 100)}% de acerto` : ""}, ${s.focusMinutes} min de foco, sequência de ${s.streak} dias.\n\nRegistros do diário:\n${entries}`,
    schema: journalReflectionSchema,
    tier: "fast" as const,
    maxTokens: 3000,
    mock: (): JournalReflection => ({
      summary: `Você fez ${input.entries.length} registros neste período e respondeu ${s.answered} questões.`,
      progress: input.entries.slice(0, 2).map((e) => `Aprendeu: ${e.learned.slice(0, 80)}`),
      recurring_difficulties: input.entries.filter((e) => e.difficulties).slice(0, 2).map((e) => e.difficulties!.slice(0, 80)),
      mood_trend: "Humor estável ao longo da semana.",
      suggestions: ["Revise o caderno de erros antes de começar matéria nova."],
      encouragement: "Constância vence intensidade. Continue!",
    }),
  };
}

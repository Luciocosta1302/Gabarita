import { z } from "zod";

import { withGrounding } from "./base";

export const LEVELS = ["basico", "intermediario", "avancado"] as const;
export type Level = (typeof LEVELS)[number];

/** Trilha de aprendizagem: etapas em ordem, com pré-requisitos, cobrindo os tópicos do material. */
export const pathSchema = z.object({
  title: z.string().min(2).max(120).describe("Nome curto da trilha"),
  steps: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        objective: z.string().min(5).max(400).describe('O que o aluno vai conseguir fazer ao fim da etapa ("Explicar...", "Calcular...")'),
        level: z.enum(LEVELS),
        topics: z.array(z.number().int().min(1)).min(1).describe("Números dos tópicos [E#] que a etapa trabalha"),
        prerequisites: z.array(z.number().int().min(1)).describe("Números das etapas ANTERIORES que precisam estar concluídas"),
      }),
    )
    .min(1),
});
export type GeneratedPath = z.infer<typeof pathSchema>;

export type PathInput = {
  subjectName: string;
  goal: string;
  topics: { name: string; summary: string | null; mastery: number | null }[];
};

const SYSTEM = withGrounding(
  [
    "Você é um tutor que monta uma trilha de aprendizagem para um aluno brasileiro, a partir dos tópicos do material dele.",
    "Ordene do básico ao avançado: primeiro o que é pré-requisito de outros assuntos. Cada etapa tem um objetivo concreto e trabalha 1 a 3 tópicos.",
    "Use de 3 a 10 etapas. Todo tópico deve aparecer em pelo menos uma etapa. Pré-requisitos só podem ser etapas anteriores.",
    "Tópicos que o aluno já domina (domínio alto) podem ficar juntos numa etapa de revisão rápida.",
    "Português do Brasil.",
  ].join("\n"),
);

export function pathPrompt(input: PathInput) {
  const topics = input.topics
    .map(
      (t, i) =>
        `E${i + 1}: ${t.name}${t.summary ? ` — ${t.summary}` : ""} (domínio: ${t.mastery == null ? "sem dados" : `${Math.round(t.mastery * 100)}%`})`,
    )
    .join("\n");
  return {
    system: SYSTEM,
    prompt: `Matéria: ${input.subjectName}\nObjetivo do aluno: ${input.goal}\n\nTópicos do material:\n${topics}\n\nMonte a trilha.`,
    schema: pathSchema,
    tier: "smart" as const,
    maxTokens: 8000,
    // Mock: uma etapa por tópico, cada uma depende da anterior.
    mock: (): GeneratedPath => ({
      title: `Trilha: ${input.goal}`.slice(0, 120),
      steps: input.topics.map((t, i) => ({
        title: `Etapa ${i + 1}: ${t.name}`,
        objective: `Explicar os pontos principais de ${t.name}.`,
        level: LEVELS[Math.min(2, Math.floor((i * 3) / Math.max(1, input.topics.length)))],
        topics: [i + 1],
        prerequisites: i === 0 ? [] : [i],
      })),
    }),
  };
}

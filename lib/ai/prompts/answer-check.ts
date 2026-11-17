import { z } from "zod";

import { findQuote } from "@/lib/text/quote";

/**
 * Conferência do gabarito: outra chamada da IA resolve as questões SEM ver a resposta, só com o
 * trecho do material. Se ela marcar outra alternativa (ou disser que não dá para decidir), a questão
 * é descartada (lib/generate/answer-check.ts).
 */
export type CheckItem = { n: number; stem: string; options: string[]; source: string };

export const answerCheckSchema = z.object({
  answers: z
    .array(
      z.object({
        n: z.number().int().describe("Número da questão"),
        choice: z.number().int().describe("Índice (0 = primeira) da ÚNICA alternativa correta segundo o trecho; -1 se o trecho não permite decidir ou se mais de uma estiver correta"),
      }),
    )
    .describe("Uma resposta para cada questão"),
});
export type AnswerCheck = z.infer<typeof answerCheckSchema>;

const SYSTEM = [
  "Você é um revisor de questões de prova. Resolva cada questão usando APENAS o trecho do material que vem junto dela.",
  "Não use conhecimento próprio. Se o trecho não permite ter certeza, ou se mais de uma alternativa estiver correta, ou nenhuma, responda -1.",
  "Responda só com o índice da alternativa (0 = primeira).",
].join("\n");

export function answerCheckPrompt(items: CheckItem[]) {
  const body = items
    .map(
      (it) =>
        `### Questão ${it.n}\nTrecho do material:\n"""${it.source}"""\nEnunciado: ${it.stem}\n${it.options.map((o, i) => `${i}) ${o}`).join("\n")}`,
    )
    .join("\n\n");
  return {
    system: SYSTEM,
    prompt: `Resolva as ${items.length} questões abaixo.\n\n${body}`,
    schema: answerCheckSchema,
    maxTokens: 800,
    // IA de teste: a alternativa certa é a que aparece literalmente no trecho;
    // em certo/errado, "é falso que" marca o item errado.
    mock: (): AnswerCheck => ({
      answers: items.map((it) => {
        if (it.options.length === 2 && it.options[0] === "Certo") return { n: it.n, choice: /é falso que/i.test(it.stem) ? 1 : 0 };
        const hits = it.options.map((o, i) => (findQuote(it.source, o) ? i : -1)).filter((i) => i >= 0);
        return { n: it.n, choice: hits.length === 1 ? hits[0] : -1 };
      }),
    }),
  };
}

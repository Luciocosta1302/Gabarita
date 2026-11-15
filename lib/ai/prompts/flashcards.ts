import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

export const flashcardsSchema = z.object({
  cards: z.array(
    z.object({
      source: z.number().int().min(1).describe("Número do trecho [T#] de onde saiu o cartão"),
      front: z.string().min(3).max(300).describe("Pergunta curta ou termo"),
      back: z.string().min(1).max(600).describe("Resposta curta e direta"),
    }),
  ),
});
export type GeneratedFlashcards = z.infer<typeof flashcardsSchema>;

const SYSTEM = withGrounding(
  [
    "Você cria flashcards para memorização a partir do material do aluno.",
    "Frente: uma pergunta objetiva ou um termo. Verso: resposta curta (1-3 frases), tirada do trecho indicado em `source`.",
    "Um conceito por cartão. Português do Brasil.",
  ].join("\n"),
);

export function flashcardsPrompt(input: { chunks: SourceChunk[]; count: number }) {
  return {
    system: SYSTEM,
    prompt: `Crie exatamente ${input.count} flashcards, distribuídos entre os trechos.\n\nTrechos do material:\n${formatSources(input.chunks)}`,
    schema: flashcardsSchema,
    tier: "fast" as const,
    mock: (): GeneratedFlashcards => ({
      cards: Array.from({ length: input.count }, (_, i) => {
        const n = i % input.chunks.length;
        return {
          source: n + 1,
          front: `Cartão ${i + 1}: o que o material diz neste ponto?`,
          back: pickSentence(input.chunks[n].content, i),
        };
      }),
    }),
  };
}

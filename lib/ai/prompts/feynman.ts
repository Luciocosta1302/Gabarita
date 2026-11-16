import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

/** D9 — Modo Feynman: o aluno explica o conceito; a IA compara com o material. */
export const feynmanSchema = z.object({
  score: z.number().int().min(0).max(100).describe("Quanto a explicação mostra de entendimento (0-100)"),
  correct: z.array(z.string()).describe("O que o aluno explicou certo"),
  missing: z.array(z.string()).describe("O que faltou explicar (está no material)"),
  wrong: z.array(z.string()).describe("O que está errado ou confuso, com a correção"),
  tip: z.string().describe("Uma dica para explicar melhor da próxima vez"),
  sources: z.array(z.number().int().min(1)).describe("Trechos [T#] usados na comparação"),
});
export type FeynmanFeedback = z.infer<typeof feynmanSchema>;

const SYSTEM = withGrounding(
  [
    "Você aplica a técnica Feynman: o aluno explica um conceito com as próprias palavras, como se ensinasse um colega.",
    "Compare a explicação com os trechos do material. Seja específico e encorajador: o que acertou, o que faltou, o que está errado (e qual é o certo).",
    "Valorize explicações simples e com exemplos; penalize decoreba sem entendimento e afirmações erradas.",
    "A explicação pode ter vindo de áudio transcrito: ignore erros de transcrição e vícios de fala.",
    "Português do Brasil.",
  ].join("\n"),
);

export function feynmanPrompt(input: { topic: string; explanation: string; chunks: SourceChunk[] }) {
  return {
    system: SYSTEM,
    prompt: `Conceito: ${input.topic}\n\nExplicação do aluno:\n"""${input.explanation}"""\n\nTrechos do material:\n${formatSources(input.chunks)}`,
    schema: feynmanSchema,
    tier: "smart" as const,
    maxTokens: 3000,
    mock: (): FeynmanFeedback => {
      const ref = pickSentence(input.chunks[0]?.content ?? input.topic, 0);
      const overlap = ref.toLowerCase().split(/\s+/).filter((w) => w.length > 5 && input.explanation.toLowerCase().includes(w)).length;
      return {
        score: Math.min(100, 20 + overlap * 15),
        correct: overlap ? ["Você citou a ideia central do material."] : [],
        missing: [ref],
        wrong: [],
        tip: "Tente dar um exemplo do dia a dia.",
        sources: input.chunks.length ? [1] : [],
      };
    },
  };
}

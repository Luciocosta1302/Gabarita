import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { mcqFields, tfFields } from "./questions";

/** D6: explica o erro e cria uma questão parecida (mesmo conceito, outro ângulo). */
export const errorFollowupSchema = z.object({
  why_wrong: z.string().min(10).describe("Por que a alternativa escolhida está errada e qual a confusão provável, em 2-4 frases"),
  followup: z
    .object(mcqFields)
    .refine((q) => q.answer_index < q.options.length, { message: "answer_index fora das alternativas" }),
});
export type ErrorFollowup = z.infer<typeof errorFollowupSchema>;

/** Variante para itens de certo ou errado (Cebraspe). */
export const errorFollowupTfSchema = z.object({
  why_wrong: errorFollowupSchema.shape.why_wrong,
  followup: z.object(tfFields),
});
export type ErrorFollowupTf = z.infer<typeof errorFollowupTfSchema>;

export type ErrorFollowupInput = {
  stem: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number;
  explanation: string | null;
  source: { content: string; page: number | null } | null;
};

const SYSTEM = withGrounding(
  [
    "Você é um tutor que ajuda o aluno a aprender com os próprios erros.",
    "Explique de forma direta por que a resposta do aluno está errada, sem julgar.",
    "Depois crie UMA questão nova de múltipla escolha (4 alternativas) sobre o MESMO conceito, mas com outro enunciado e outras alternativas — não repita a questão original.",
    "A questão nova deve ser respondível só com o trecho do material, e `quote` deve ser cópia literal de uma frase do trecho.",
    "Português do Brasil.",
  ].join("\n"),
);

const letter = (i: number) => String.fromCharCode(65 + i);

export function errorFollowupPrompt(input: ErrorFollowupInput) {
  const prompt = [
    `Questão original: ${input.stem}`,
    ...input.options.map((o, i) => `${letter(i)}) ${o}`),
    `Resposta correta: ${letter(input.correctIndex)}`,
    `O aluno marcou: ${letter(input.chosenIndex)}`,
    input.explanation ? `Explicação original: ${input.explanation}` : "",
    "",
    input.source
      ? `Trecho do material${input.source.page != null ? ` (página ${input.source.page})` : ""}:\n${input.source.content}`
      : "Não há trecho do material disponível. Baseie-se apenas na questão e na explicação acima.",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    system: SYSTEM,
    prompt,
    schema: errorFollowupSchema,
    tier: "smart" as const,
    mock: (): ErrorFollowup => {
      const quote = pickSentence(input.source?.content ?? input.explanation ?? input.stem, 1);
      return {
        why_wrong: `Você marcou "${input.options[input.chosenIndex]}", mas o material diz outra coisa.`,
        followup: {
          quote,
          stem: "Questão parecida: qual afirmação está de acordo com o material?",
          options: [quote, "Alternativa incorreta A", "Alternativa incorreta B", "Alternativa incorreta C"],
          answer_index: 0,
          explanation: `O material afirma: "${quote}"`,
          difficulty: "media",
        },
      };
    },
  };
}

const TF_SYSTEM = withGrounding(
  [
    "Você é um tutor que ajuda o aluno a aprender com os próprios erros em itens de 'certo ou errado'.",
    "Explique de forma direta por que o julgamento do aluno está errado (qual detalhe da afirmação decide), sem julgar.",
    "Depois crie UM item novo de certo ou errado sobre o MESMO conceito, com outra afirmação.",
    "O item novo deve ser julgável só com o trecho do material, e `quote` deve ser cópia literal de uma frase do trecho.",
    "Português do Brasil.",
  ].join("\n"),
);

export function errorFollowupTfPrompt(input: { statement: string; isTrue: boolean; explanation: string | null; source: { content: string; page: number | null } | null }) {
  const prompt = [
    `Item: ${input.statement}`,
    `Gabarito: ${input.isTrue ? "CERTO" : "ERRADO"}`,
    `O aluno julgou: ${input.isTrue ? "ERRADO" : "CERTO"}`,
    input.explanation ? `Explicação original: ${input.explanation}` : "",
    "",
    input.source
      ? `Trecho do material${input.source.page != null ? ` (página ${input.source.page})` : ""}:\n${input.source.content}`
      : "Não há trecho do material disponível. Baseie-se apenas no item e na explicação acima.",
  ]
    .filter((l) => l !== "")
    .join("\n");
  return {
    system: TF_SYSTEM,
    prompt,
    schema: errorFollowupTfSchema,
    tier: "smart" as const,
    mock: (): ErrorFollowupTf => {
      const quote = pickSentence(input.source?.content ?? input.explanation ?? input.statement, 1);
      return {
        why_wrong: `O item estava ${input.isTrue ? "certo" : "errado"} segundo o material.`,
        followup: { quote, statement: `Item parecido: ${quote}`, is_true: true, explanation: `O material afirma: "${quote}"`, difficulty: "media" },
      };
    },
  };
}

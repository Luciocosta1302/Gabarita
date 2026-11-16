import { z } from "zod";

import { STYLE_SPECS, type ExamStyle } from "@/lib/exam-styles";
import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

export const DIFFICULTIES = ["facil", "media", "dificil"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABELS: Record<Difficulty | "misturada", string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
  misturada: "Misturada",
};

/** Campos de uma questão de múltipla escolha (sem a fonte). Reaproveitado pela questão parecida (D6). */
export const mcqFields = {
  quote: z
    .string()
    .min(8)
    .max(600)
    .describe("Cópia LITERAL (palavra por palavra) de uma frase do trecho que comprova a resposta correta"),
  stem: z.string().min(10).describe("Enunciado da questão"),
  options: z.array(z.string().min(1)).min(4).max(5).describe("Alternativas, sem letras na frente"),
  answer_index: z.number().int().min(0).max(4).describe("Índice (0-based) da alternativa correta"),
  explanation: z.string().min(10).describe("Por que a correta está certa e as outras erradas, com base no trecho"),
  difficulty: z.enum(DIFFICULTIES),
};

const answerInRange = (q: { options: string[]; answer_index: number }) => q.answer_index < q.options.length;

export const questionsSchema = z.object({
  questions: z.array(
    z
      .object({
        source: z.number().int().min(1).describe("Número do trecho [T#] que embasa a questão"),
        ...mcqFields,
      })
      .refine(answerInRange, { message: "answer_index fora das alternativas" }),
  ),
});
export type GeneratedQuestions = z.infer<typeof questionsSchema>;

export type QuestionsInput = {
  chunks: SourceChunk[];
  count: number;
  difficulty: Difficulty | "misturada";
  /** Estilo de prova/banca (D5). */
  style?: ExamStyle;
};

const SYSTEM = withGrounding(
  [
    "Você é um professor brasileiro que escreve questões de prova a partir do material de estudo do aluno.",
    "Cada questão deve ser respondível SOMENTE com o trecho indicado em `source`, e `quote` deve ser uma cópia literal de uma frase desse trecho.",
    "Escreva em português do Brasil. Alternativas plausíveis, uma única correta, sem 'todas as anteriores' ou 'nenhuma das anteriores'.",
    "Não mencione 'o trecho' ou 'o texto' no enunciado; pergunte sobre o conteúdo.",
  ].join("\n"),
);

function difficultyLine(d: QuestionsInput["difficulty"]) {
  return d === "misturada" ? "Misture as dificuldades (fácil, média e difícil)." : `Todas com dificuldade "${d}".`;
}

export function questionsPrompt(input: QuestionsInput) {
  const spec = STYLE_SPECS[input.style ?? "livre"];
  const prompt = [
    `Gere exatamente ${input.count} questões de múltipla escolha com ${spec.options} alternativas cada. ${difficultyLine(input.difficulty)}`,
    spec.guide,
    "Distribua as questões entre os trechos diferentes e não repita o mesmo conceito.",
    "",
    "Trechos do material:",
    formatSources(input.chunks),
  ].join("\n");

  return {
    system: SYSTEM,
    prompt,
    schema: questionsSchema,
    tier: "smart" as const,
    mock: (): GeneratedQuestions => ({
      questions: Array.from({ length: input.count }, (_, i) => {
        const n = i % input.chunks.length;
        const quote = pickSentence(input.chunks[n].content, Math.floor(i / input.chunks.length));
        const wrong = Array.from({ length: spec.options - 1 }, (_, k) => `Alternativa incorreta ${k + 1}`);
        return {
          source: n + 1,
          quote,
          stem: `Questão ${i + 1}: de acordo com o material, qual afirmação está correta?`,
          options: [quote, ...wrong],
          answer_index: 0,
          explanation: `O material afirma: "${quote}"`,
          difficulty: input.difficulty === "misturada" ? DIFFICULTIES[i % 3] : input.difficulty,
        };
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Certo ou errado (Cebraspe)
// ---------------------------------------------------------------------------

export const tfFields = {
  quote: mcqFields.quote,
  statement: z.string().min(10).describe("Afirmação para o aluno julgar como certa ou errada"),
  is_true: z.boolean().describe("true se a afirmação está CERTA segundo o material"),
  explanation: z.string().min(10).describe("Por que está certa ou errada, com base no trecho"),
  difficulty: z.enum(DIFFICULTIES),
};

export const trueFalseSchema = z.object({
  items: z.array(
    z.object({
      source: z.number().int().min(1).describe("Número do trecho [T#] que embasa o item"),
      ...tfFields,
    }),
  ),
});
export type GeneratedTrueFalse = z.infer<typeof trueFalseSchema>;

const TF_SYSTEM = withGrounding(
  [
    "Você é um examinador brasileiro que escreve itens de 'certo ou errado' a partir do material de estudo do aluno.",
    "Cada item deve ser julgável SOMENTE com o trecho indicado em `source`, e `quote` deve ser uma cópia literal da frase do trecho que decide se o item está certo ou errado.",
    "Português do Brasil. Não mencione 'o trecho' ou 'o texto' na afirmação.",
  ].join("\n"),
);

export function trueFalsePrompt(input: Omit<QuestionsInput, "style">) {
  return {
    system: TF_SYSTEM,
    prompt: [
      `Gere exatamente ${input.count} itens de certo ou errado. ${difficultyLine(input.difficulty)}`,
      STYLE_SPECS.cebraspe.guide,
      "Distribua os itens entre os trechos diferentes.",
      "",
      "Trechos do material:",
      formatSources(input.chunks),
    ].join("\n"),
    schema: trueFalseSchema,
    tier: "smart" as const,
    mock: (): GeneratedTrueFalse => ({
      items: Array.from({ length: input.count }, (_, i) => {
        const n = i % input.chunks.length;
        const quote = pickSentence(input.chunks[n].content, Math.floor(i / input.chunks.length));
        return {
          source: n + 1,
          quote,
          // no mock, itens pares certos e ímpares errados
          statement: i % 2 === 0 ? `Item ${i + 1}: ${quote}` : `Item ${i + 1}: é falso que ${quote}`,
          is_true: i % 2 === 0,
          explanation: `O material afirma: "${quote}"`,
          difficulty: input.difficulty === "misturada" ? DIFFICULTIES[i % 3] : input.difficulty,
        };
      }),
    }),
  };
}

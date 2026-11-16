import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { DIFFICULTIES, mcqFields, type Difficulty } from "./questions";
import { formatSources, type SourceChunk } from "./sources";

/** D10 — critérios fixos da rubrica (peso em %). */
export const RUBRIC_CRITERIA = [
  { key: "conteudo", label: "Conteúdo", weight: 50 },
  { key: "clareza", label: "Clareza e organização", weight: 25 },
  { key: "termos", label: "Uso de termos técnicos", weight: 25 },
] as const;
export type CriterionKey = (typeof RUBRIC_CRITERIA)[number]["key"];

export const openQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      source: z.number().int().min(1).describe("Número do trecho [T#] que embasa a questão"),
      quote: mcqFields.quote,
      stem: z.string().min(10).describe("Enunciado da questão discursiva (pede explicação, comparação, justificativa...)"),
      expected_answer: z.string().min(20).describe("Resposta-modelo, em 3 a 6 frases, só com o que está no trecho"),
      key_points: z.array(z.string().min(3)).min(2).max(6).describe("Pontos que uma boa resposta precisa ter"),
      key_terms: z.array(z.string()).max(8).describe("Termos técnicos que se espera ver"),
      difficulty: z.enum(DIFFICULTIES),
    }),
  ),
});
export type GeneratedOpen = z.infer<typeof openQuestionsSchema>;

const SYSTEM = withGrounding(
  [
    "Você é um professor brasileiro que escreve questões DISCURSIVAS (respostas abertas, de um parágrafo) a partir do material do aluno.",
    "Cada questão deve ser respondível só com o trecho indicado em `source`; `quote` é uma cópia literal de uma frase desse trecho.",
    "Peça explicação, comparação, justificativa ou aplicação, nunca só uma definição de uma palavra.",
    "Português do Brasil.",
  ].join("\n"),
);

export function openQuestionsPrompt(input: { chunks: SourceChunk[]; count: number; difficulty: Difficulty | "misturada"; styleGuide?: string }) {
  return {
    system: SYSTEM,
    prompt: [
      `Gere exatamente ${input.count} questões discursivas. ${input.difficulty === "misturada" ? "Misture as dificuldades." : `Dificuldade "${input.difficulty}".`}`,
      input.styleGuide ?? "",
      "",
      "Trechos do material:",
      formatSources(input.chunks),
    ]
      .filter((l) => l !== "")
      .join("\n"),
    schema: openQuestionsSchema,
    tier: "smart" as const,
    mock: (): GeneratedOpen => ({
      questions: Array.from({ length: input.count }, (_, i) => {
        const n = i % input.chunks.length;
        const quote = pickSentence(input.chunks[n].content, Math.floor(i / input.chunks.length));
        return {
          source: n + 1,
          quote,
          stem: `Discursiva ${i + 1}: explique, com suas palavras, o que o material diz neste ponto.`,
          expected_answer: `Segundo o material, ${quote}`,
          key_points: [quote, "Relacionar o conceito com um exemplo."],
          key_terms: quote.split(/\s+/).filter((w) => w.length > 8).slice(0, 2),
          difficulty: input.difficulty === "misturada" ? DIFFICULTIES[i % 3] : input.difficulty,
        };
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Correção com rubrica
// ---------------------------------------------------------------------------

export const gradeOpenSchema = z.object({
  criteria: z
    .array(
      z.object({
        criterion: z.enum(["conteudo", "clareza", "termos"]),
        score: z.number().min(0).max(10),
        comment: z.string().min(3).describe("Comentário curto e específico sobre este critério"),
      }),
    )
    .length(3),
  correct_points: z.array(z.string()).describe("O que o aluno acertou"),
  missing_points: z.array(z.string()).describe("Pontos esperados que faltaram"),
  wrong_points: z.array(z.string()).describe("Afirmações erradas ou imprecisas da resposta"),
  overall: z.string().min(5).describe("Comentário geral e como melhorar, em 2-3 frases"),
});
export type OpenGrade = z.infer<typeof gradeOpenSchema>;

const GRADE_SYSTEM = withGrounding(
  [
    "Você corrige respostas discursivas de um aluno brasileiro com uma rubrica, como um professor justo e exigente.",
    "Critérios (nota de 0 a 10 cada): conteudo = cobre os pontos esperados sem erros; clareza = organização e argumentação; termos = uso correto dos termos técnicos.",
    "Baseie a correção no trecho do material e na resposta-modelo. Não penalize sinônimos corretos nem a ordem das ideias.",
    "Se a resposta estiver em branco ou fora do tema, dê 0 em conteúdo.",
    "Português do Brasil.",
  ].join("\n"),
);

export function gradeOpenPrompt(input: {
  stem: string;
  expected: string;
  keyPoints: string[];
  keyTerms: string[];
  source: string | null;
  answer: string;
}) {
  return {
    system: GRADE_SYSTEM,
    prompt: [
      `Questão: ${input.stem}`,
      `Resposta-modelo: ${input.expected}`,
      `Pontos esperados: ${input.keyPoints.join("; ")}`,
      input.keyTerms.length ? `Termos esperados: ${input.keyTerms.join(", ")}` : "",
      input.source ? `Trecho do material:\n${input.source}` : "",
      "",
      `Resposta do aluno:\n"""${input.answer}"""`,
    ]
      .filter((l) => l !== "")
      .join("\n"),
    schema: gradeOpenSchema,
    tier: "smart" as const,
    maxTokens: 3000,
    // Mock: nota proporcional aos pontos esperados que aparecem na resposta.
    mock: (): OpenGrade => {
      const lower = input.answer.toLowerCase();
      const hit = input.keyPoints.filter((p) => p.toLowerCase().split(/\s+/).filter((w) => w.length > 4).some((w) => lower.includes(w)));
      const content = input.answer.trim().length < 15 ? 0 : Math.round((hit.length / Math.max(1, input.keyPoints.length)) * 10);
      return {
        criteria: [
          { criterion: "conteudo", score: content, comment: "Avaliação de teste do conteúdo." },
          { criterion: "clareza", score: input.answer.length > 60 ? 8 : 4, comment: "Avaliação de teste da clareza." },
          { criterion: "termos", score: content > 5 ? 7 : 3, comment: "Avaliação de teste dos termos." },
        ],
        correct_points: hit,
        missing_points: input.keyPoints.filter((p) => !hit.includes(p)),
        wrong_points: [],
        overall: "Correção de teste.",
      };
    },
  };
}

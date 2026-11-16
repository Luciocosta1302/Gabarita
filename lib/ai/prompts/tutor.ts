import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

// ---------------------------------------------------------------------------
// Explicação da etapa (normal ou mais simples, depois de um erro)
// ---------------------------------------------------------------------------

export const tutorExplainSchema = z.object({
  explanation: z.string().min(20).describe("Explicação didática em 2 a 4 parágrafos curtos, citando os trechos com [n]"),
  key_points: z.array(z.string().min(3)).min(2).max(6).describe("Pontos-chave para lembrar"),
  example: z.string().describe("Um exemplo concreto ou analogia do dia a dia (vazio se não couber)"),
  sources: z.array(z.number().int().min(1)).describe("Números dos trechos [T#] usados"),
});
export type TutorExplanation = z.infer<typeof tutorExplainSchema>;

const EXPLAIN_SYSTEM = withGrounding(
  [
    "Você é um tutor paciente que ensina um aluno brasileiro a partir do material de estudo dele.",
    "Explique como um bom professor particular: frases curtas, do mais simples ao mais complexo, conectando com o que o aluno já sabe.",
    "Cite os trechos do material com [n] (o número do trecho). Não entregue respostas de questões; ensine o conceito.",
    "Português do Brasil.",
  ].join("\n"),
);

export function tutorExplainPrompt(input: {
  stepTitle: string;
  objective: string;
  level: string;
  chunks: SourceChunk[];
  /** depois de um erro: o que o aluno não entendeu (explicar de outro jeito, mais simples) */
  difficulty?: string;
}) {
  const simpler = input.difficulty
    ? `O aluno errou e a dificuldade parece ser: "${input.difficulty}". Explique DE OUTRO JEITO, mais simples, focando nesse ponto, com um exemplo concreto ou analogia.`
    : `Nível da etapa: ${input.level}. Comece pelo essencial.`;
  return {
    system: EXPLAIN_SYSTEM,
    prompt: `Etapa: ${input.stepTitle}\nObjetivo: ${input.objective}\n${simpler}\n\nTrechos do material:\n${formatSources(input.chunks)}`,
    schema: tutorExplainSchema,
    tier: "smart" as const,
    maxTokens: 4000,
    mock: (): TutorExplanation => ({
      explanation: `${input.difficulty ? "Vamos de outro jeito, mais simples. " : ""}${pickSentence(input.chunks[0]?.content ?? input.objective, 0)} [1]`,
      key_points: input.chunks.slice(0, 3).map((c, i) => pickSentence(c.content, i)).concat(["Ponto-chave de teste."]).slice(0, 3),
      example: input.difficulty ? "Pense nisso como uma usina de energia dentro da célula." : "",
      sources: input.chunks.length ? [1] : [],
    }),
  };
}

// ---------------------------------------------------------------------------
// Diagnóstico do erro
// ---------------------------------------------------------------------------

export const tutorDiagnoseSchema = z.object({
  difficulty: z.string().min(5).max(300).describe("O que o aluno provavelmente não entendeu, em 1 frase"),
  message: z.string().min(10).describe("Fala curta e acolhedora para o aluno explicando o erro (2 a 3 frases), sem dar a resposta de outras questões"),
});
export type TutorDiagnosis = z.infer<typeof tutorDiagnoseSchema>;

const DIAGNOSE_SYSTEM = withGrounding(
  [
    "Você é um tutor que identifica a dificuldade de um aluno a partir de uma resposta errada.",
    "Seja específico (qual confusão ou conceito faltou), acolhedor e breve. Português do Brasil.",
  ].join("\n"),
);

export function tutorDiagnosePrompt(input: {
  stem: string;
  options: string[];
  correct: string;
  chosen: string;
  explanation: string | null;
  source: string | null;
}) {
  return {
    system: DIAGNOSE_SYSTEM,
    prompt: [
      `Questão: ${input.stem}`,
      `Alternativas: ${input.options.join(" | ")}`,
      `Correta: ${input.correct}`,
      `O aluno marcou: ${input.chosen}`,
      input.explanation ? `Explicação: ${input.explanation}` : "",
      input.source ? `Trecho do material:\n${input.source}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    schema: tutorDiagnoseSchema,
    tier: "fast" as const,
    mock: (): TutorDiagnosis => ({
      difficulty: `Confundiu "${input.chosen}" com "${input.correct}".`,
      message: `Você marcou "${input.chosen}", mas a resposta é "${input.correct}". Vamos rever esse ponto com calma.`,
    }),
  };
}

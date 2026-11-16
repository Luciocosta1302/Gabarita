import { z } from "zod";

/** D11 — foto de uma questão: transcreve, resolve passo a passo e diz o assunto para buscar no material. */
export const solvePhotoSchema = z.object({
  readable: z.boolean().describe("false se a foto não tem uma questão legível"),
  question: z.string().describe("Enunciado transcrito (e alternativas, se houver)"),
  steps: z.array(z.string()).describe("Resolução passo a passo, um passo por item"),
  answer: z.string().describe("Resposta final (letra e/ou valor)"),
  confidence: z.enum(["alta", "media", "baixa"]).describe("Quão seguro você está da resposta"),
  subject_query: z.string().describe("Assunto/conceitos da questão, em uma frase, para procurar no material do aluno"),
});
export type PhotoSolution = z.infer<typeof solvePhotoSchema>;

const SYSTEM = [
  "Você é um professor brasileiro que resolve questões de prova a partir de uma foto.",
  "Transcreva a questão, resolva passo a passo de forma didática (explique o porquê de cada passo) e dê a resposta final.",
  "Se a foto estiver ilegível ou não tiver questão, coloque readable = false e explique em `question`.",
  "Se não tiver certeza, diga isso em `confidence` e no último passo; nunca invente dados que não estão na foto.",
  "Em subject_query, escreva o assunto da questão para o aluno encontrar no próprio material.",
  "Português do Brasil.",
].join("\n");

export function solvePhotoPrompt() {
  return {
    system: SYSTEM,
    prompt: "Resolva a questão desta foto.",
    schema: solvePhotoSchema,
    tier: "smart" as const,
    maxTokens: 6000,
    mock: (): PhotoSolution => ({
      readable: true,
      question: "Onde ocorre a respiração celular?",
      steps: ["A questão pergunta sobre a organela da respiração celular.", "A respiração celular acontece nas mitocôndrias."],
      answer: "Nas mitocôndrias.",
      confidence: "alta",
      subject_query: "respiração celular mitocôndrias ATP",
    }),
  };
}

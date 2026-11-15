import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

export const chatSchema = z.object({
  has_basis: z.boolean().describe("false se os trechos não têm base para responder"),
  answer: z
    .string()
    .min(1)
    .describe("Resposta em português; cite os trechos usados com [1], [2]... (o número do trecho [T#])"),
  sources: z.array(z.number().int().min(1)).describe("Números dos trechos [T#] usados na resposta"),
});
export type ChatAnswer = z.infer<typeof chatSchema>;

export type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM = withGrounding(
  [
    "Você é um tutor que responde dúvidas do aluno usando o material de estudo dele.",
    "Responda só com base nos trechos fornecidos e cite cada afirmação com o número do trecho entre colchetes, ex.: [2].",
    "Se os trechos não tiverem a resposta, coloque has_basis = false e diga que o material não cobre isso (pode sugerir o que procurar).",
    "Seja claro e didático. Português do Brasil.",
  ].join("\n"),
);

export function chatPrompt(input: { question: string; history: ChatTurn[]; chunks: SourceChunk[] }) {
  const history = input.history.length
    ? `Conversa até aqui:\n${input.history.map((t) => `${t.role === "user" ? "Aluno" : "Tutor"}: ${t.content}`).join("\n")}\n\n`
    : "";
  return {
    system: SYSTEM,
    prompt: `${history}Trechos do material:\n${input.chunks.length ? formatSources(input.chunks) : "(nenhum trecho encontrado)"}\n\nPergunta do aluno: ${input.question}`,
    schema: chatSchema,
    tier: "smart" as const,
    maxTokens: 4000,
    mock: (): ChatAnswer =>
      input.chunks.length
        ? { has_basis: true, answer: `Segundo o material: ${pickSentence(input.chunks[0].content, 0)} [1]`, sources: [1] }
        : { has_basis: false, answer: "Não encontrei base no seu material para responder isso.", sources: [] },
  };
}

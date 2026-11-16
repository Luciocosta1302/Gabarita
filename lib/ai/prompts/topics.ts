import { z } from "zod";

import { withGrounding } from "./base";

/** D8: agrupa trechos do material em tópicos (como itens de um conteúdo programático). */
export const topicsSchema = z.object({
  new_topics: z
    .array(
      z.object({
        key: z.string().min(1).describe('Identificador do tópico novo, ex.: "N1"'),
        name: z.string().min(2).max(80).describe("Nome curto do tópico (2 a 6 palavras)"),
        summary: z.string().max(400).describe("Do que trata o tópico, em 1 frase"),
      }),
    )
    .describe("Tópicos novos (só crie se nenhum existente servir)"),
  assignments: z
    .array(
      z.object({
        chunk: z.number().int().min(1).describe("Número do trecho [T#]"),
        topic: z.string().min(1).describe('Tópico do trecho: um existente ("E1"...) ou novo ("N1"...)'),
      }),
    )
    .describe("Um tópico para CADA trecho"),
});
export type TopicsResult = z.infer<typeof topicsSchema>;

export type TopicsInput = {
  subjectName: string;
  existing: { name: string; summary: string | null }[];
  chunks: { preview: string }[];
};

const SYSTEM = withGrounding(
  [
    "Você organiza o material de estudo de um aluno em tópicos, como os itens do conteúdo programático de uma prova.",
    "Cada tópico agrupa trechos sobre o mesmo assunto. Prefira de 4 a 12 tópicos no total para um material comum; nomes curtos e claros.",
    "Reaproveite os tópicos existentes sempre que o trecho couber neles. Crie tópico novo só para assunto diferente.",
    "Trechos sem conteúdo de estudo (sumário, capa, referências) vão para o tópico mais próximo.",
    "Português do Brasil.",
  ].join("\n"),
);

export function topicsPrompt(input: TopicsInput) {
  const existing = input.existing.length
    ? input.existing.map((t, i) => `E${i + 1}: ${t.name}${t.summary ? ` — ${t.summary}` : ""}`).join("\n")
    : "(nenhum ainda)";
  const chunks = input.chunks.map((c, i) => `[T${i + 1}] ${c.preview.replace(/\s+/g, " ").trim()}`).join("\n");
  return {
    system: SYSTEM,
    prompt: `Matéria: ${input.subjectName}\n\nTópicos existentes:\n${existing}\n\nTrechos (início de cada um):\n${chunks}\n\nDê um tópico para cada um dos ${input.chunks.length} trechos.`,
    schema: topicsSchema,
    tier: "fast" as const,
    maxTokens: 16000,
    // Mock: um tópico a cada 3 trechos (ou reaproveita o primeiro existente).
    mock: (): TopicsResult => {
      const groups = Math.max(1, Math.ceil(input.chunks.length / 3));
      if (input.existing.length) {
        return { new_topics: [], assignments: input.chunks.map((_, i) => ({ chunk: i + 1, topic: "E1" })) };
      }
      return {
        new_topics: Array.from({ length: groups }, (_, g) => ({ key: `N${g + 1}`, name: `Tópico ${g + 1}`, summary: "Tópico de teste." })),
        assignments: input.chunks.map((_, i) => ({ chunk: i + 1, topic: `N${Math.floor(i / 3) + 1}` })),
      };
    },
  };
}

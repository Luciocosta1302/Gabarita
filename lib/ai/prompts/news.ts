import { z } from "zod";

/** Resumo de notícia para estudantes: curto, fiel ao texto, e por que importa para o objetivo do aluno. */
export const newsSummarySchema = z.object({
  points: z.array(z.string().min(3)).min(1).max(4).describe("2 a 4 frases curtas com o essencial da notícia (datas, prazos, quem pode participar)"),
  why: z.string().min(3).describe("Uma frase: para quais estudantes isso importa (vestibulandos, concurseiros, universitários...) e o que fazer; se não importar, diga que é só informativa"),
  dates: z.array(z.string()).max(4).describe("Datas e prazos citados no texto (ex.: 'Inscrições até 12/12'); vazio se não houver"),
});
export type NewsSummary = z.infer<typeof newsSummarySchema>;

const SYSTEM = [
  "Você resume notícias sobre educação, vestibulares e concursos para estudantes brasileiros.",
  "Use APENAS o texto fornecido. Não invente datas, números, nomes ou regras. Se o texto for só um trecho curto, resuma o que dá e não complete com suposições.",
  "Frases curtas e claras, em português do Brasil. Destaque prazos e o que o estudante precisa fazer, se o texto disser.",
].join("\n");

export function newsSummaryPrompt(input: { title: string; source: string; text: string; partial: boolean }) {
  return {
    system: SYSTEM,
    prompt: `Fonte: ${input.source}\nTítulo: ${input.title}\n${input.partial ? "(Só temos o trecho da notícia, não o texto completo.)\n" : ""}\nTexto:\n${input.text}`,
    schema: newsSummarySchema,
    tier: "fast" as const,
    maxTokens: 900,
    mock: (): NewsSummary => ({
      points: [`Resumo de teste: ${input.title.slice(0, 80)}`, input.partial ? "Baseado só no trecho da notícia." : "Baseado no texto da notícia."],
      why: "Pode interessar a vestibulandos e universitários.",
      dates: [],
    }),
  };
}

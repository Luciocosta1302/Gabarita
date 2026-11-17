import { z } from "zod";

/**
 * Resumo de notícia com prova: cada frase traz o trecho LITERAL do texto que a sustenta.
 * O servidor confere (lib/news/verify.ts) e descarta o que não estiver no texto — contra notícia inventada.
 */
const backed = z.object({
  text: z.string().min(3).describe("Frase curta e fiel ao texto, em português do Brasil"),
  evidence: z.string().min(10).describe("Trecho copiado EXATAMENTE do texto da notícia (palavra por palavra) que comprova a frase"),
});

export const newsSummarySchema = z.object({
  points: z.array(backed).min(1).max(4).describe("2 a 4 pontos com o essencial (o quê, quem, quando)"),
  dates: z.array(backed).max(4).describe("Datas e prazos que o texto cita (ex.: 'Inscrições até 12/12'); vazio se não houver"),
});
export type NewsSummaryDraft = z.infer<typeof newsSummarySchema>;

const SYSTEM = [
  "Você resume notícias sobre educação, vestibulares e concursos para estudantes brasileiros.",
  "REGRAS (obrigatórias):",
  "1. Use APENAS o texto fornecido. Não acrescente fatos, contexto, opiniões, previsões ou conhecimento próprio.",
  "2. Copie números, datas, nomes e valores EXATAMENTE como estão no texto. Nunca calcule, arredonde ou converta.",
  "3. Para cada frase, coloque em `evidence` o trecho copiado literalmente do texto que a comprova.",
  "4. Se algo não estiver claro no texto, não escreva. Menos pontos é melhor que um ponto errado.",
  "5. Não use termos que o texto não usa (ex.: não diga 'confirmado' se o texto diz 'deve', 'pode', 'previsto').",
].join("\n");

export function newsSummaryPrompt(input: { title: string; source: string; text: string; partial: boolean; strict?: boolean }) {
  return {
    system: SYSTEM,
    prompt: `Fonte: ${input.source}\nTítulo: ${input.title}\n${input.partial ? "(Só temos o trecho da notícia, não o texto completo. Resuma só o que está no trecho.)\n" : ""}${input.strict ? "ATENÇÃO: a tentativa anterior teve frases sem comprovação literal no texto. Seja ainda mais literal.\n" : ""}\nTexto:\n${input.text}`,
    schema: newsSummarySchema,
    tier: "fast" as const,
    maxTokens: 1200,
    mock: (): NewsSummaryDraft => {
      const first = input.text.replace(/\s+/g, " ").trim().slice(0, 60);
      return {
        points: [
          { text: "Resumo de teste conferido com o texto.", evidence: first },
          // frase sem comprovação: a verificação tem que descartar
          { text: "Frase inventada com 999 vagas.", evidence: "trecho que não existe no texto da notícia" },
        ],
        dates: [],
      };
    },
  };
}

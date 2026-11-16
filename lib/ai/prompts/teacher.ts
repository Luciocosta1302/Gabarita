import { z } from "zod";

/** D4 — Prova do Professor: estilo do professor a partir de provas antigas. */
export const teacherProfileSchema = z.object({
  summary: z.string().min(10).describe("Como é a prova desse professor, em 2-3 frases"),
  question_types: z
    .array(z.object({ type: z.enum(["multipla_escolha", "certo_errado", "discursiva", "calculo", "outro"]), share: z.number().min(0).max(100) }))
    .describe("Tipos de questão e % aproximada de cada"),
  options_count: z.number().int().min(0).max(6).describe("Nº típico de alternativas (0 se não houver objetivas)"),
  stem_length: z.enum(["curto", "medio", "longo"]).describe("Tamanho típico do enunciado"),
  traps: z.array(z.string()).max(8).describe("Pegadinhas e armadilhas recorrentes"),
  style_notes: z.array(z.string()).max(8).describe("Outras marcas do estilo (palavras de comando, uso de casos, gráficos, etc.)"),
  example_stems: z.array(z.string()).max(3).describe("Até 3 enunciados curtos copiados das provas, como exemplo do estilo"),
  likely_topics: z
    .array(
      z.object({
        name: z.string().min(2),
        topic: z.number().int().min(0).describe("Número do tópico do material [E#] que corresponde (0 se nenhum)"),
        weight: z.number().int().min(1).max(5).describe("Chance de cair: 1 (baixa) a 5 (muito alta)"),
        reason: z.string().describe("Por que: quantas vezes apareceu, peso nas provas..."),
      }),
    )
    .describe("Tópicos com mais chance de cair, do mais provável ao menos"),
});
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;

const SYSTEM = [
  "Você analisa provas antigas de um professor (ou banca) para ajudar um aluno brasileiro a se preparar.",
  "Descreva o ESTILO das provas com base apenas no texto delas: tipos de questão, tamanho dos enunciados, pegadinhas, palavras de comando e os assuntos mais cobrados.",
  "Em likely_topics, ligue cada assunto cobrado a um tópico do material do aluno (E#) quando houver correspondência; use 0 se não houver.",
  "Não invente o que não está nas provas. Português do Brasil.",
].join("\n");

export function teacherProfilePrompt(input: { exams: { title: string; text: string }[]; topics: { name: string }[] }) {
  const exams = input.exams.map((e, i) => `=== Prova ${i + 1}: ${e.title} ===\n${e.text.slice(0, 40_000)}`).join("\n\n");
  const topics = input.topics.length ? input.topics.map((t, i) => `E${i + 1}: ${t.name}`).join("\n") : "(o aluno ainda não enviou material)";
  return {
    system: SYSTEM,
    prompt: `Tópicos do material do aluno:\n${topics}\n\nProvas antigas:\n${exams}`,
    schema: teacherProfileSchema,
    tier: "smart" as const,
    maxTokens: 6000,
    mock: (): TeacherProfile => ({
      summary: "Prova objetiva com enunciados curtos e uma discursiva no final.",
      question_types: [
        { type: "multipla_escolha", share: 80 },
        { type: "discursiva", share: 20 },
      ],
      options_count: 5,
      stem_length: "curto",
      traps: ["Troca de termos parecidos", "Alternativas com 'sempre' e 'nunca'"],
      style_notes: ["Usa 'é correto afirmar que'"],
      example_stems: [input.exams[0]?.text.split(/\n/).find((l) => l.trim().length > 20)?.slice(0, 160) ?? "Exemplo de enunciado."],
      likely_topics: input.topics.slice(0, 3).map((t, i) => ({ name: t.name, topic: i + 1, weight: 5 - i, reason: "Apareceu em todas as provas." })),
    }),
  };
}

/** Texto curto com o estilo, para colar no prompt de geração de questões. */
export function teacherStyleGuide(p: TeacherProfile) {
  return [
    `Siga o estilo das provas deste professor: ${p.summary}`,
    `Enunciados de tamanho ${p.stem_length}.`,
    p.traps.length ? `Pegadinhas que ele costuma usar: ${p.traps.join("; ")}.` : "",
    p.style_notes.length ? `Marcas do estilo: ${p.style_notes.join("; ")}.` : "",
    p.example_stems.length ? `Exemplos de enunciados dele: ${p.example_stems.map((s) => `"${s}"`).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

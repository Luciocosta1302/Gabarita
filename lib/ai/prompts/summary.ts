import { z } from "zod";

import { pickSentence } from "@/lib/text/quote";

import { withGrounding } from "./base";
import { formatSources, type SourceChunk } from "./sources";

export const summarySchema = z.object({
  title: z.string().min(1).max(200),
  overview: z.string().min(1).describe("Visão geral em 2-4 frases"),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        points: z.array(z.string().min(1)).min(1).describe("Pontos-chave, frases curtas"),
        pages: z.array(z.number().int()).describe("Páginas do material de onde saíram estes pontos"),
      }),
    )
    .min(1),
});
export type Summary = z.infer<typeof summarySchema>;

const SYSTEM = withGrounding(
  [
    "Você resume material de estudo para um aluno que vai fazer prova.",
    "Organize por assunto, com pontos-chave curtos (definições, fórmulas, datas, listas, comparações).",
    "Em `pages`, informe as páginas indicadas nos trechos de onde tirou cada seção.",
    "Português do Brasil.",
  ].join("\n"),
);

export function summaryPrompt(input: { title: string; chunks: SourceChunk[]; partial?: boolean }) {
  return {
    system: SYSTEM,
    prompt: [
      input.partial
        ? `Resuma esta PARTE do material "${input.title}". Outra etapa vai juntar as partes.`
        : `Resuma o material "${input.title}".`,
      "",
      "Trechos do material:",
      formatSources(input.chunks, { pageMarks: true }),
    ].join("\n"),
    schema: summarySchema,
    tier: input.partial ? ("fast" as const) : ("smart" as const),
    mock: (): Summary => ({
      title: input.title,
      overview: pickSentence(input.chunks[0]?.content ?? "Sem conteúdo.", 0),
      sections: input.chunks.slice(0, 5).map((c, i) => ({
        heading: `Parte ${i + 1}`,
        points: [pickSentence(c.content, 0), pickSentence(c.content, 1)],
        pages: c.page != null ? [c.page] : [],
      })),
    }),
  };
}

/** Junta resumos parciais (materiais grandes) num resumo só. */
export function summaryMergePrompt(input: { title: string; partials: Summary[] }) {
  return {
    system: SYSTEM,
    prompt: [
      `Junte estes resumos parciais do material "${input.title}" num único resumo, sem repetir pontos e mantendo as páginas.`,
      "",
      JSON.stringify(input.partials),
    ].join("\n"),
    schema: summarySchema,
    tier: "smart" as const,
    mock: (): Summary => ({
      title: input.title,
      overview: input.partials[0]?.overview ?? "",
      sections: input.partials.flatMap((p) => p.sections),
    }),
  };
}

import { z } from "zod";

const SYSTEM =
  "Você transcreve material de estudo (fotos de caderno, quadro, livro, PDF escaneado). Transcreva TODO o texto visível, fielmente, na ordem de leitura, mantendo parágrafos e listas. Fórmulas em texto simples. Não resuma, não comente, não invente o que não dá para ler (use [ilegível]).";

export const ocrImageSchema = z.object({ text: z.string().describe("Todo o texto da imagem") });

export function ocrImagePrompt() {
  return {
    system: SYSTEM,
    prompt: "Transcreva o texto desta imagem.",
    schema: ocrImageSchema,
    tier: "fast" as const,
    mock: () => ({ text: "Texto extraído da imagem pelo OCR de teste. A fotossíntese ocorre nos cloroplastos." }),
  };
}

export const ocrPdfSchema = z.object({
  pages: z.array(z.object({ page: z.number().int().min(1), text: z.string() })),
});

/** PDF escaneado: transcreve um intervalo de páginas por vez para a resposta não ficar gigante. */
export function ocrPdfPrompt(input: { from: number; to: number }) {
  return {
    system: SYSTEM,
    prompt: `Transcreva as páginas ${input.from} a ${input.to} deste PDF (numeração física, começando em 1). Uma entrada por página.`,
    schema: ocrPdfSchema,
    tier: "fast" as const,
    maxTokens: 32000,
    mock: () => ({
      pages: Array.from({ length: input.to - input.from + 1 }, (_, i) => ({
        page: input.from + i,
        text: `Texto da página ${input.from + i} extraído pelo OCR de teste.`,
      })),
    }),
  };
}

/**
 * Interface própria da camada de IA. O resto do app só conhece estes tipos,
 * então dá para trocar de fornecedor (Claude, OpenAI, Voyage, Whisper...) sem mexer em nada fora de lib/ai.
 */

/** "smart" = modelo forte (geração de questões, correção). "fast" = modelo barato (tarefas simples). */
export type ModelTier = "smart" | "fast";

export type ImageInput = { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string };

export type TextRequest = {
  system?: string;
  prompt: string;
  tier?: ModelTier;
  maxTokens?: number;
  /** Imagens para tarefas com visão (OCR de foto / PDF escaneado). */
  images?: ImageInput[];
};

export type Usage = { inputTokens: number; outputTokens: number };

export type TextResult = { text: string; usage: Usage };

export type TranscribeInput = { data: Uint8Array; filename: string; mimeType: string; language?: string };

export interface AIProvider {
  readonly name: string;
  generateText(req: TextRequest): Promise<TextResult>;
  /** Um vetor de 1536 dimensões por texto, na mesma ordem. */
  embed(texts: string[]): Promise<number[][]>;
  transcribe(input: TranscribeInput): Promise<{ text: string }>;
}

export const EMBEDDING_DIMENSIONS = 1536;

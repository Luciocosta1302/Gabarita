import "server-only";

import { generateJSONWith, type JSONRequest } from "./json";
import { MockProvider } from "./providers/mock";
import type { AIProvider, TextRequest, TranscribeInput } from "./types";

let current: AIProvider | null = null;

function createProvider(): AIProvider {
  const name = process.env.AI_PROVIDER ?? "mock";
  switch (name) {
    case "mock":
      return new MockProvider();
    // case "anthropic": Fase 1 — Claude (geração) + OpenAI (embeddings/Whisper)
    default:
      throw new Error(`AI_PROVIDER desconhecido: "${name}"`);
  }
}

export function getProvider(): AIProvider {
  current ??= createProvider();
  return current;
}

/** Só para testes: troca o fornecedor em uso. */
export function setProvider(p: AIProvider | null) {
  current = p;
}

export const generateText = (req: TextRequest) => getProvider().generateText(req);
export const generateJSON = <T>(req: JSONRequest<T>) => generateJSONWith(getProvider(), req);
export const embed = (texts: string[]) => getProvider().embed(texts);
export const transcribe = (input: TranscribeInput) => getProvider().transcribe(input);

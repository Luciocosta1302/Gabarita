import "server-only";

import { generateJSONWith, type JSONRequest } from "./json";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { MockProvider } from "./providers/mock";
import { OpenAIEmbeddings } from "./providers/openai";
import type { AIProvider, EmbedOptions, TextRequest, TranscribeInput } from "./types";
import { recordUsage } from "./usage";

let current: AIProvider | null = null;

function createProvider(): AIProvider {
  // Em produção não existe padrão: sem AI_PROVIDER o app falharia em silêncio com questões falsas da IA de teste.
  const name = process.env.AI_PROVIDER ?? (process.env.NODE_ENV === "production" ? undefined : "mock");
  if (!name) throw new Error("AI_PROVIDER não configurado (use gemini ou anthropic nas variáveis de ambiente do servidor).");
  switch (name) {
    case "mock":
      return new MockProvider();
    case "gemini":
      // Google Gemini para tudo (tem cota grátis, sem cartão)
      return new GeminiProvider();
    case "anthropic":
      // Claude (geração) + OpenAI (embeddings/Whisper)
      return new AnthropicProvider(new OpenAIEmbeddings());
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

// Toda chamada registra o uso de tokens do usuário da requisição/job atual (lib/ai/usage).
export async function generateText(req: TextRequest) {
  const r = await getProvider().generateText(req);
  recordUsage(r.usage);
  return r;
}
export async function generateJSON<T>(req: JSONRequest<T>) {
  const r = await generateJSONWith(getProvider(), req);
  recordUsage(r.usage);
  return r;
}
export async function embed(texts: string[], opts?: EmbedOptions) {
  const r = await getProvider().embed(texts, opts);
  // embeddings cobram só a entrada; aproximação de 4 caracteres por token
  recordUsage({ inputTokens: Math.ceil(texts.join("").length / 4), outputTokens: 0 });
  return r;
}
export const transcribe = (input: TranscribeInput) => getProvider().transcribe(input);
export async function transcribeVideo(url: string) {
  const r = await getProvider().transcribeVideo(url);
  recordUsage(r.usage);
  return r;
}

import {
  EMBEDDING_DIMENSIONS,
  type AIProvider,
  type TextRequest,
  type TextResult,
  type TranscribeInput,
} from "../types";

/**
 * Google Gemini para geração, visão (OCR de foto/PDF), transcrição e embeddings.
 * Usa o endpoint compatível com OpenAI do Gemini (chave no header Authorization: Bearer).
 * Tem cota grátis (chave em aistudio.google.com, sem cartão). Atenção: na cota grátis o Google
 * pode usar o conteúdo enviado para melhorar os produtos dele.
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const EMBED_BATCH = 100;
/** Espera antes de tentar de novo no limite por minuto (429) ou com o servidor sobrecarregado (5xx). */
const RETRY_WAITS_MS = [5_000, 15_000, 30_000];
const REQUEST_TIMEOUT_MS = 120_000;

export class AIBlockedError extends Error {
  constructor(reason: string) {
    super(`A IA bloqueou a resposta (${reason}).`);
    this.name = "AIBlockedError";
  }
}

export class AIRateLimitError extends Error {
  readonly rateLimited = true;
  constructor() {
    super("Limite de uso da IA atingido. Tente de novo em alguns minutos.");
    this.name = "AIRateLimitError";
  }
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  constructor(
    private readonly models = {
      // Na cota grátis o "flash" fica em fila (46-86 s por resposta em teste); o "flash-lite" responde em ~1 s.
      smart: process.env.GEMINI_MODEL_SMART || "gemini-flash-lite-latest",
      fast: process.env.GEMINI_MODEL_FAST || "gemini-flash-lite-latest",
      embed: process.env.GEMINI_MODEL_EMBED || "gemini-embedding-001",
    },
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  ) {
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < RETRY_WAITS_MS.length) {
        await this.sleep(RETRY_WAITS_MS[attempt]);
        continue;
      }
      if (res.status === 429) throw new AIRateLimitError();
      if (!res.ok) throw new Error(`Gemini respondeu ${res.status}: ${(await res.text()).slice(0, 500)}`);
      return (await res.json()) as T;
    }
  }

  private async chat(model: string, system: string | undefined, parts: ContentPart[], maxTokens: number, json: boolean) {
    const res = await this.post<ChatResponse>("/chat/completions", {
      model,
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: parts }],
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    });
    const choice = res.choices?.[0];
    const text = choice?.message?.content;
    if (!text) throw new AIBlockedError(choice?.finish_reason ?? "sem texto");
    return {
      text,
      usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 },
    };
  }

  generateText(req: TextRequest): Promise<TextResult> {
    const parts: ContentPart[] = [
      ...(req.documents ?? []).map((d) => ({
        type: "image_url" as const,
        image_url: { url: `data:${d.mediaType};base64,${d.base64}` },
      })),
      ...(req.images ?? []).map((img) => ({
        type: "image_url" as const,
        image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
      })),
      { type: "text", text: req.prompt },
    ];
    return this.chat(this.models[req.tier ?? "smart"], req.system, parts, req.maxTokens ?? 16000, !!req.json);
  }

  // O endpoint compatível com OpenAI não tem "taskType"; documento e pergunta usam o mesmo modo.
  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH);
      const res = await this.post<{ data?: { index: number; embedding: number[] }[] }>("/embeddings", {
        model: this.models.embed,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });
      const vectors = [...(res.data ?? [])].sort((a, b) => a.index - b.index).map((d) => d.embedding);
      if (vectors.length !== batch.length || vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error("Resposta de embeddings do Gemini com tamanho inesperado.");
      }
      out.push(...vectors);
    }
    return out;
  }

  async transcribe(input: TranscribeInput): Promise<{ text: string }> {
    const format = input.mimeType.includes("wav") ? "wav" : "mp3";
    const { text } = await this.chat(
      this.models.fast,
      undefined,
      [
        { type: "input_audio", input_audio: { data: Buffer.from(input.data).toString("base64"), format } },
        {
          type: "text",
          text: `Transcreva fielmente este áudio${input.language ? ` (idioma: ${input.language})` : ""}. Devolva só a transcrição.`,
        },
      ],
      16000,
      false,
    );
    return { text };
  }
}

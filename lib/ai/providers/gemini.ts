import { UserFacingError } from "@/lib/errors";

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

/** Gemini sobrecarregado (503 "high demand") mesmo depois das novas tentativas: passageiro, mensagem clara. */
export class AIBusyError extends Error {
  readonly rateLimited = true;
  constructor() {
    super("A IA gratuita está muito ocupada agora (muita gente usando ao mesmo tempo). Tente de novo em 1 ou 2 minutos.");
    this.name = "AIBusyError";
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
    private readonly models: { smart: string; fast: string; embed: string; fallback?: string } = {
      // Na cota grátis o "flash" fica em fila (46-86 s por resposta em teste); o "flash-lite" responde em ~1 s.
      smart: process.env.GEMINI_MODEL_SMART || "gemini-flash-lite-latest",
      fast: process.env.GEMINI_MODEL_FAST || "gemini-flash-lite-latest",
      embed: process.env.GEMINI_MODEL_EMBED || "gemini-embedding-001",
      // reserva: quando o modelo principal está sobrecarregado (503), tenta este (outra fila no Google)
      fallback: process.env.GEMINI_MODEL_FALLBACK || "gemini-3.1-flash-lite",
    },
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  ) {
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
  }

  /** `busyRetries`: quantas vezes esperar e repetir num 503 (com modelo reserva, troca logo de modelo). */
  private async post<T>(path: string, body: unknown, busyRetries = RETRY_WAITS_MS.length): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < (res.status === 503 ? busyRetries : RETRY_WAITS_MS.length)) {
        await this.sleep(RETRY_WAITS_MS[attempt]);
        continue;
      }
      if (res.status === 429) throw new AIRateLimitError();
      if (res.status === 503) throw new AIBusyError();
      if (!res.ok) throw new Error(`Gemini respondeu ${res.status}: ${(await res.text()).slice(0, 500)}`);
      return (await res.json()) as T;
    }
  }

  private async chat(model: string, system: string | undefined, parts: ContentPart[], maxTokens: number, json: boolean) {
    const body = (m: string) => ({
      model: m,
      messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: parts }],
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    });
    const fallback = this.models.fallback && this.models.fallback !== model ? this.models.fallback : null;
    let res: ChatResponse;
    try {
      res = await this.post<ChatResponse>("/chat/completions", body(model), fallback ? 1 : RETRY_WAITS_MS.length);
    } catch (e) {
      if (!(e instanceof AIBusyError) || !fallback) throw e;
      console.warn(`[gemini] ${model} sobrecarregado; usando ${fallback}`);
      res = await this.post<ChatResponse>("/chat/completions", body(fallback));
    }
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

  /**
   * Vídeo público do YouTube: o Gemini busca e assiste o vídeo pela URL (mesmo recurso que o NotebookLM usa).
   * No endpoint compatível com OpenAI, a URL vai como "image_url". Medido: ~90 tokens por segundo de vídeo
   * (3,5 min = 19,5 mil tokens, 7 s). A cota grátis limita tokens por minuto, então cabe até ~40 min por vídeo.
   */
  async transcribeVideo(url: string): Promise<TextResult> {
    try {
      return await this.chat(
        this.models.fast,
        undefined,
        [
          { type: "image_url", image_url: { url } },
          {
            type: "text",
            text: [
              "Transcreva fielmente tudo o que é falado neste vídeo, no idioma original.",
              "Divida em parágrafos curtos e comece cada parágrafo com o tempo no formato [mm:ss] (ou [h:mm:ss]).",
              "Se houver texto importante na tela (slides, fórmulas, quadro) que não foi falado, inclua entre colchetes: [Na tela: ...].",
              "Devolva só a transcrição, sem comentários.",
            ].join("\n"),
          },
        ],
        65000,
        false,
      );
    } catch (e) {
      if (e instanceof AIRateLimitError) {
        throw Object.assign(new UserFacingError("A IA gratuita não deu conta desse vídeo agora (limite por minuto). Tente de novo em alguns minutos ou use um vídeo de até ~40 minutos."), { rateLimited: true });
      }
      const msg = e instanceof Error ? e.message : "";
      // Só erros 4xx falam do vídeo. 5xx ("503 UNAVAILABLE" = Gemini sobrecarregado) é passageiro:
      // segue como erro comum para o job tentar de novo, em vez de dizer que o vídeo é privado.
      const status = Number(/^Gemini respondeu (\d{3})/.exec(msg)?.[1] ?? 0);
      if (status < 400 || status >= 500) throw e;
      if (/token|too long|exceeds|limit/i.test(msg)) throw new UserFacingError("Vídeo longo demais para a IA gratuita (até ~40 minutos por vídeo).");
      throw new UserFacingError("Não conseguimos assistir esse vídeo. Ele precisa ser público (não pode ser privado nem não listado com restrição).");
    }
  }

  async transcribe(input: TranscribeInput): Promise<{ text: string }> {
    const name = input.filename.toLowerCase();
    const format = input.mimeType.includes("wav") || name.endsWith(".wav") ? "wav" : input.mimeType.includes("mpeg") || name.endsWith(".mp3") ? "mp3" : null;
    if (!format) throw new UserFacingError("Com a IA gratuita (Gemini), envie o áudio em MP3 ou WAV.");
    // o pedido vai inteiro em base64: acima de ~14 MB passa do limite do Gemini
    if (input.data.byteLength > 14 * 1024 * 1024) throw new UserFacingError("Áudio grande demais para a IA gratuita (máx. ~14 MB). Divida a aula em partes.");
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
      32000,
      false,
    );
    return { text };
  }
}

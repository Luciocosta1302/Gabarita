import { GoogleGenAI, type Part } from "@google/genai";

import {
  EMBEDDING_DIMENSIONS,
  type AIProvider,
  type EmbedOptions,
  type TextRequest,
  type TextResult,
  type TranscribeInput,
} from "../types";

const EMBED_BATCH = 100;

export class AIBlockedError extends Error {
  constructor(reason: string) {
    super(`A IA bloqueou a resposta (${reason}).`);
    this.name = "AIBlockedError";
  }
}

/**
 * Google Gemini para geração, visão (OCR), embeddings e transcrição.
 * Tem cota grátis (chave em aistudio.google.com, sem cartão). Atenção: na cota grátis o Google
 * pode usar o conteúdo enviado para melhorar os produtos dele.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(
    private readonly models = {
      smart: process.env.GEMINI_MODEL_SMART || "gemini-flash-latest",
      fast: process.env.GEMINI_MODEL_FAST || "gemini-flash-lite-latest",
      embed: process.env.GEMINI_MODEL_EMBED || "gemini-embedding-001",
    },
    apiKey = process.env.GEMINI_API_KEY,
  ) {
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(req: TextRequest): Promise<TextResult> {
    const parts: Part[] = [
      ...(req.documents ?? []).map((d) => ({ inlineData: { mimeType: d.mediaType, data: d.base64 } })),
      ...(req.images ?? []).map((img) => ({ inlineData: { mimeType: img.mediaType, data: img.base64 } })),
      { text: req.prompt },
    ];

    const res = await this.client.models.generateContent({
      model: this.models[req.tier ?? "smart"],
      contents: [{ role: "user", parts }],
      config: {
        ...(req.system ? { systemInstruction: req.system } : {}),
        maxOutputTokens: req.maxTokens ?? 16000,
        // As respostas de lib/ai são JSON (validado com Zod em generateJSON); pedir JSON evita texto solto.
        ...(req.json ? { responseMimeType: "application/json" } : {}),
      },
    });

    const text = res.text;
    if (!text) {
      const reason = res.promptFeedback?.blockReason ?? res.candidates?.[0]?.finishReason ?? "sem texto";
      throw new AIBlockedError(String(reason));
    }
    return {
      text,
      usage: {
        inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  async embed(texts: string[], opts?: EmbedOptions): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const res = await this.client.models.embedContent({
        model: this.models.embed,
        contents: texts.slice(i, i + EMBED_BATCH),
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: opts?.purpose === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
        },
      });
      const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
      if (vectors.length !== Math.min(EMBED_BATCH, texts.length - i) || vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error("Resposta de embeddings do Gemini com tamanho inesperado.");
      }
      out.push(...vectors);
    }
    return out;
  }

  async transcribe(input: TranscribeInput): Promise<{ text: string }> {
    const res = await this.client.models.generateContent({
      model: this.models.fast,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: input.mimeType, data: Buffer.from(input.data).toString("base64") } },
            { text: `Transcreva fielmente este áudio${input.language ? ` (idioma: ${input.language})` : ""}. Devolva só a transcrição.` },
          ],
        },
      ],
    });
    if (!res.text) throw new AIBlockedError(String(res.candidates?.[0]?.finishReason ?? "sem texto"));
    return { text: res.text };
  }
}

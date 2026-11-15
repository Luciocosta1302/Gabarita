import Anthropic from "@anthropic-ai/sdk";

import type { AIProvider, TextRequest, TextResult, TranscribeInput } from "../types";

export class AIRefusalError extends Error {
  constructor(readonly category: string | null) {
    super(`A IA recusou o pedido${category ? ` (${category})` : ""}.`);
    this.name = "AIRefusalError";
  }
}

type Delegate = Pick<AIProvider, "embed" | "transcribe">;

/**
 * Claude para geração de texto. Embeddings e transcrição não existem na API da Anthropic,
 * então são delegados a outro fornecedor (OpenAI).
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    private readonly delegate: Delegate,
    private readonly models = {
      smart: process.env.AI_MODEL_SMART || "claude-sonnet-5-5",
      fast: process.env.AI_MODEL_FAST || "claude-haiku-5-5",
    },
    apiKey = process.env.ANTHROPIC_API_KEY,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(req: TextRequest): Promise<TextResult> {
    const model = this.models[req.tier ?? "smart"];
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...(req.documents ?? []).map(
        (d): Anthropic.Beta.BetaContentBlockParam => ({
          type: "document",
          source: { type: "base64", media_type: d.mediaType, data: d.base64 },
        }),
      ),
      ...(req.images ?? []).map(
        (img): Anthropic.Beta.BetaContentBlockParam => ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.base64 },
        }),
      ),
      { type: "text", text: req.prompt },
    ];

    // Streaming evita timeout HTTP em respostas longas (OCR, muitas questões).
    // Fallback no servidor: se o Sonnet recusar, a própria API tenta outro modelo. O Haiku não tem esse recurso.
    const withFallback = model.startsWith("claude-sonnet");
    const message = await this.client.beta.messages
      .stream({
        model,
        max_tokens: req.maxTokens ?? 16000,
        ...(req.system ? { system: req.system } : {}),
        messages: [{ role: "user", content }],
        ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      })
      .finalMessage();

    if (message.stop_reason === "refusal") {
      throw new AIRefusalError(message.stop_details?.category ?? null);
    }

    const text = message.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
    };
  }

  embed(texts: string[]) {
    return this.delegate.embed(texts);
  }

  transcribe(input: TranscribeInput) {
    return this.delegate.transcribe(input);
  }
}

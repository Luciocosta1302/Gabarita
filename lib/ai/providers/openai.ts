import { EMBEDDING_DIMENSIONS, type TranscribeInput } from "../types";

const BASE_URL = "https://api.openai.com/v1";
const EMBED_BATCH = 100;

/** Embeddings (text-embedding-3-small, 1536 dim) e transcrição (Whisper) pela API REST da OpenAI. */
export class OpenAIEmbeddings {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY) {}

  private key() {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada (necessária para embeddings e transcrição).");
    return this.apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH);
      const res = await fetch(`${BASE_URL}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "text-embedding-3-small", input: batch, dimensions: EMBEDDING_DIMENSIONS }),
      });
      if (!res.ok) throw new Error(`Embeddings falharam (${res.status}): ${await res.text()}`);
      const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      const sorted = [...json.data].sort((a, b) => a.index - b.index);
      out.push(...sorted.map((d) => d.embedding));
    }
    return out;
  }

  async transcribe(input: TranscribeInput): Promise<{ text: string }> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(input.data)], { type: input.mimeType }), input.filename);
    form.append("model", "whisper-1");
    if (input.language) form.append("language", input.language);
    const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key()}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Transcrição falhou (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as { text: string };
    return { text: json.text };
  }
}

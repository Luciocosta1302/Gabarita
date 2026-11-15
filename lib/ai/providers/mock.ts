import { EMBEDDING_DIMENSIONS, type AIProvider, type TextRequest, type TextResult } from "../types";

type Handler = (req: TextRequest) => string | Promise<string>;

/**
 * Fornecedor falso para testes e desenvolvimento sem chave.
 * - generateText: responde com as respostas enfileiradas (`enqueue`), senão com `req.mock()`, senão com o `handler`.
 * - embed: vetor determinístico (mesmo texto => mesmo vetor), normalizado.
 * - transcribe: devolve um texto fixo.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly calls: TextRequest[] = [];
  private queue: string[] = [];

  constructor(private handler: Handler = () => "{}") {}

  /** Enfileira respostas que serão devolvidas em ordem pelas próximas chamadas. */
  enqueue(...responses: string[]) {
    this.queue.push(...responses);
    return this;
  }

  async generateText(req: TextRequest): Promise<TextResult> {
    this.calls.push(req);
    const queued = this.queue.shift();
    const text = queued ?? (req.mock ? JSON.stringify(req.mock()) : await this.handler(req));
    return {
      text,
      usage: { inputTokens: approxTokens(`${req.system ?? ""}${req.prompt}`), outputTokens: approxTokens(text) },
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(fakeEmbedding);
  }

  async transcribe(): Promise<{ text: string }> {
    return { text: "Transcrição de teste." };
  }
}

function approxTokens(s: string) {
  return Math.ceil(s.length / 4);
}

/** Embedding falso: bag-of-words com hash, para que textos com palavras em comum fiquem próximos. */
export function fakeEmbedding(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
    v[Math.abs(h) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

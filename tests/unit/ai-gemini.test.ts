import { afterEach, describe, expect, it, vi } from "vitest";

import { getProvider, setProvider } from "@/lib/ai/provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini";

afterEach(() => {
  setProvider(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const models = { smart: "s", fast: "f", embed: "e" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("AI_PROVIDER=gemini", () => {
  it("escolhe o Gemini quando configurado", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "chave-de-teste");
    expect(getProvider().name).toBe("gemini");
  });

  it("sem chave dá erro claro", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(() => getProvider()).toThrow("GEMINI_API_KEY");
  });

  it("manda sistema, imagem e pedido de JSON no formato compatível com OpenAI", async () => {
    const fetchMock = vi.fn(async () =>
      json({ choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 10, completion_tokens: 3 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = new GeminiProvider(models, "k");
    const out = await p.generateText({
      system: "sys",
      prompt: "oi",
      tier: "fast",
      json: true,
      images: [{ mediaType: "image/jpeg", base64: "AAA" }],
    });
    expect(out).toEqual({ text: '{"ok":true}', usage: { inputTokens: 10, outputTokens: 3 } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/openai\/chat\/completions$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("f");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.messages[1].content[0].image_url.url).toBe("data:image/jpeg;base64,AAA");
  });

  it("espera e tenta de novo no limite (429) ou servidor sobrecarregado (503); depois desiste com erro claro", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ choices: [{ message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const sleeps: number[] = [];
    const p = new GeminiProvider(models, "k", async (ms) => void sleeps.push(ms));
    expect((await p.generateText({ prompt: "x" })).text).toBe("ok");
    expect(sleeps).toEqual([5000, 15000]);

    vi.stubGlobal("fetch", vi.fn(async () => json({}, 429)));
    await expect(new GeminiProvider(models, "k", async () => {}).generateText({ prompt: "x" })).rejects.toThrow(
      "Limite de uso da IA",
    );
  });

  it("embeddings em lotes, na ordem e com 1536 dimensões", async () => {
    const vec = (n: number) => Array(1536).fill(n);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ data: [{ index: 1, embedding: vec(2) }, { index: 0, embedding: vec(1) }] })),
    );
    const out = await new GeminiProvider(models, "k").embed(["a", "b"]);
    expect(out.map((v) => v[0])).toEqual([1, 2]);
  });

  it("resposta vazia vira erro (bloqueio)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ choices: [{ message: { content: null }, finish_reason: "content_filter" }] })));
    await expect(new GeminiProvider(models, "k").generateText({ prompt: "x" })).rejects.toThrow("content_filter");
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AIValidationError, extractJSON, generateJSONWith } from "@/lib/ai/json";
import { MockProvider } from "@/lib/ai/providers/mock";

const schema = z.object({ items: z.array(z.object({ q: z.string(), a: z.string() })).min(1) });

describe("extractJSON", () => {
  it("tira cercas de código e texto em volta", () => {
    expect(extractJSON('Aqui está:\n```json\n{"a":1}\n```\nPronto')).toBe('{"a":1}');
    expect(extractJSON('blá [1,2] blá')).toBe("[1,2]");
  });
});

describe("generateJSONWith", () => {
  it("devolve o JSON validado na primeira tentativa", async () => {
    const ai = new MockProvider().enqueue('{"items":[{"q":"1+1?","a":"2"}]}');
    const { data, usage } = await generateJSONWith(ai, { prompt: "gere", schema });
    expect(data.items[0].a).toBe("2");
    expect(ai.calls).toHaveLength(1);
    expect(ai.calls[0].system).toContain("JSON Schema");
    expect(usage.outputTokens).toBeGreaterThan(0);
  });

  it("tenta de novo 1x quando a validação falha, mandando o erro", async () => {
    const ai = new MockProvider().enqueue('{"items":[]}', '{"items":[{"q":"x","a":"y"}]}');
    const { data } = await generateJSONWith(ai, { prompt: "gere", schema });
    expect(data.items).toHaveLength(1);
    expect(ai.calls).toHaveLength(2);
    expect(ai.calls[1].prompt).toContain("não passou na validação");
  });

  it("desiste depois de 2 tentativas inválidas", async () => {
    const ai = new MockProvider().enqueue("isso não é json", '{"items":"errado"}', '{"items":[{"q":"x","a":"y"}]}');
    await expect(generateJSONWith(ai, { prompt: "gere", schema })).rejects.toBeInstanceOf(AIValidationError);
    expect(ai.calls).toHaveLength(2);
  });
});

describe("MockProvider.embed", () => {
  it("gera vetores de 1536 dimensões, determinísticos e normalizados", async () => {
    const ai = new MockProvider();
    const [a, b, c] = await ai.embed(["fotossíntese na folha", "fotossíntese na folha", "revolução francesa"]);
    expect(a).toHaveLength(1536);
    expect(a).toEqual(b);
    const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0);
    expect(dot(a, a)).toBeCloseTo(1, 5);
    expect(dot(a, c)).toBeLessThan(dot(a, b));
  });
});

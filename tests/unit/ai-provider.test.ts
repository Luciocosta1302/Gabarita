import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { generateJSON, getProvider, setProvider } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/providers/mock";
import { GROUNDING_RULE, withGrounding } from "@/lib/ai/prompts/base";

afterEach(() => setProvider(null));

describe("lib/ai/provider", () => {
  it("usa o mock por padrão", () => {
    expect(getProvider().name).toBe("mock");
  });

  it("generateJSON passa pelo fornecedor configurado", async () => {
    setProvider(new MockProvider().enqueue('{"ok":true}'));
    const { data } = await generateJSON({ prompt: "x", schema: z.object({ ok: z.boolean() }) });
    expect(data.ok).toBe(true);
  });

  it("todo prompt pode levar a regra de usar só o material", () => {
    expect(withGrounding("Gere questões.")).toContain(GROUNDING_RULE);
  });
});

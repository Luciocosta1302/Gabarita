import { afterEach, describe, expect, it, vi } from "vitest";

import { getProvider, setProvider } from "@/lib/ai/provider";

afterEach(() => {
  setProvider(null);
  vi.unstubAllEnvs();
});

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
});

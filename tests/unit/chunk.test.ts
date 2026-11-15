import { describe, expect, it } from "vitest";

import { approxTokens, chunkPages, cleanText } from "@/lib/ingest/chunk";

const words = (n: number, prefix = "palavra") => Array.from({ length: n }, (_, i) => `${prefix}${i}.`).join(" ");

describe("cleanText", () => {
  it("junta hifenização de fim de linha e espaços repetidos", () => {
    expect(cleanText("conheci-\nmento   é   poder\n\n\n\nfim")).toBe("conhecimento é poder\n\nfim");
  });
});

describe("chunkPages", () => {
  it("texto curto vira um trecho só, com a página", () => {
    const chunks = chunkPages([{ page: 3, text: "Um texto curto sobre fotossíntese." }]);
    expect(chunks).toEqual([{ index: 0, page: 3, content: "Um texto curto sobre fotossíntese." }]);
  });

  it("respeita ~800 tokens por trecho e tem sobreposição", () => {
    const text = words(2000);
    const chunks = chunkPages([{ page: 1, text }]);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(approxTokens(c.content)).toBeLessThanOrEqual(800);
    // o fim de um trecho reaparece no começo do próximo
    for (let i = 1; i < chunks.length; i++) {
      const tail = chunks[i - 1].content.slice(-60).split(" ").slice(1).join(" ");
      expect(chunks[i].content).toContain(tail);
    }
    expect(chunks.map((c) => c.index)).toEqual(chunks.map((_, i) => i));
  });

  it("cada trecho guarda a página onde começa", () => {
    const pages = [1, 2, 3, 4].map((page) => ({ page, text: words(500, `p${page}w`) }));
    const chunks = chunkPages(pages);
    for (const c of chunks) {
      const firstWord = c.content.split(" ")[0];
      expect(firstWord.startsWith(`p${c.page}w`)).toBe(true);
    }
    expect(new Set(chunks.map((c) => c.page))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("ignora páginas vazias e devolve [] sem texto", () => {
    expect(chunkPages([{ page: 1, text: "   " }])).toEqual([]);
    expect(chunkPages([{ page: 1, text: "" }, { page: 2, text: "Algum texto." }])[0].page).toBe(2);
  });
});

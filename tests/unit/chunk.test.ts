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
    expect(chunks).toEqual([{ index: 0, page: 3, content: "Um texto curto sobre fotossíntese.", breaks: [] }]);
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

describe("páginas dentro do trecho", () => {
  it("guarda onde cada slide começa e a citação aponta a página certa", async () => {
    const { quotePage } = await import("@/lib/text/pages");
    const slides = [
      { page: 1, text: "HISTÓRIA 8º ANO" },
      { page: 4, text: "Em 1820 a Revolução Liberal do Porto limitou o poder real." },
      { page: 10, text: "No dia 09 de Janeiro de 1822 ficou conhecido como Dia do Fico." },
    ];
    const [c] = chunkPages(slides);
    expect(c.page).toBe(1);
    expect(c.breaks.map((b) => b[1])).toEqual([4, 10]);
    for (const [at] of c.breaks) expect(c.content.slice(at)).toMatch(/^(Em 1820|No dia)/);
    const chunk = { content: c.content, page: c.page, page_breaks: c.breaks };
    expect(quotePage(chunk, "Revolução Liberal do Porto limitou")).toBe(4);
    expect(quotePage(chunk, "ficou conhecido como Dia do Fico")).toBe(10);
    expect(quotePage(chunk, "HISTÓRIA")).toBe(1);
    expect(quotePage(chunk, "frase que não existe")).toBe(1);
    // trechos antigos (sem page_breaks) continuam na página do começo
    expect(quotePage({ content: c.content, page: 1 }, "Dia do Fico")).toBe(1);
  });

  it("trecho que começa no meio guarda só as páginas que começam depois", () => {
    const long = (n: number) => Array.from({ length: 300 }, (_, i) => `palavra${n}x${i}`).join(" ");
    const chunks = chunkPages([{ page: 1, text: long(1) }, { page: 2, text: long(2) }, { page: 3, text: long(3) }]);
    for (const c of chunks) {
      for (const [at, pg] of c.breaks) {
        expect(at).toBeGreaterThan(0);
        expect(c.content.slice(at)).toMatch(new RegExp(`^palavra${pg}x0 `));
      }
    }
    expect(chunks.some((c) => c.breaks.length > 0)).toBe(true);
  });
});

describe("página da resposta do chat", () => {
  it("escolhe a página do trecho que mais combina com a resposta", async () => {
    const { bestPageFor } = await import("@/lib/text/pages");
    const [c] = chunkPages([
      { page: 10, text: "No dia 09 de Janeiro de 1822 D. Pedro recebeu um manifesto: Dia do Fico." },
      { page: 14, text: "Em 02 de Setembro de 1822 a princesa Leopoldina assinou a Declaração de Independência." },
      { page: 15, text: "Em 07 de Setembro D. Pedro deu o Grito do Ipiranga." },
    ]);
    const chunk = { content: c.content, page: c.page, page_breaks: c.breaks };
    expect(bestPageFor(chunk, "A Declaração de Independência foi assinada pela princesa Leopoldina [1].")).toBe(14);
    expect(bestPageFor(chunk, "Foi o Grito do Ipiranga.")).toBe(15);
    expect(bestPageFor(chunk, "nada a ver")).toBe(10);
  });
});

describe("marcas de página para a IA", () => {
  it("formatSources com pageMarks marca o começo de cada página", async () => {
    const { formatSources } = await import("@/lib/ai/prompts/sources");
    const [c] = chunkPages([{ page: 4, text: "Revolução do Porto." }, { page: 10, text: "Dia do Fico." }]);
    const out = formatSources([{ id: "x", page: c.page, content: c.content, page_breaks: c.breaks }], { pageMarks: true });
    expect(out).toMatch(/Revolução do Porto\.\s*\n\[página 10\]\n\s*Dia do Fico/);
    expect(formatSources([{ id: "x", page: c.page, content: c.content, page_breaks: c.breaks }])).not.toContain("[página 10]");
  });
});

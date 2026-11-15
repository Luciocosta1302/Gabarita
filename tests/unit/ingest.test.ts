import { afterEach, describe, expect, it } from "vitest";

import { setProvider } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/providers/mock";
import { isUserFacing } from "@/lib/errors";
import { extractMaterial, extractPdf, splitPseudoPages } from "@/lib/ingest/extract";
import { materialTypeFor, storagePathFor } from "@/lib/validation/upload";

import { makePdf, studyPages } from "../fixtures/make-pdf";

afterEach(() => setProvider(null));

describe("extração de PDF", () => {
  it("extrai o texto por página, com acentos", async () => {
    const { pages, pageCount } = await extractPdf(makePdf(studyPages(3)), 100);
    expect(pageCount).toBe(3);
    expect(pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(pages[0].text).toContain("fotossíntese ocorre nos cloroplastos");
    expect(pages[1].text).toContain("respiração celular");
  });

  it("recusa PDF acima do limite de páginas do plano", async () => {
    const err = await extractPdf(makePdf(studyPages(5)), 4).catch((e) => e);
    expect(isUserFacing(err)).toBe(true);
    expect(err.message).toContain("5 páginas");
  });

  it("página sem texto (escaneada) vai para o OCR da IA", async () => {
    const mock = new MockProvider();
    setProvider(mock);
    const pages = studyPages(3);
    pages[1] = ""; // página 2 "escaneada"
    const out = await extractPdf(makePdf(pages), 100);
    expect(out.pages[1].text).toBe("Texto da página 2 extraído pelo OCR de teste.");
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].documents?.[0].mediaType).toBe("application/pdf");
    expect(mock.calls[0].prompt).toContain("páginas 2 a 2");
  });

  it("PDF inválido dá erro amigável", async () => {
    const err = await extractPdf(new TextEncoder().encode("não é pdf"), 100).catch((e) => e);
    expect(isUserFacing(err)).toBe(true);
  });
});

describe("texto e DOCX", () => {
  it("divide texto corrido em partes de ~3000 caracteres", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Parágrafo ${i}. ${"bla ".repeat(60)}`).join("\n\n");
    const { pages, pageCount } = splitPseudoPages(text);
    expect(pageCount).toBeGreaterThan(1);
    for (const p of pages) expect(p.text.length).toBeLessThanOrEqual(3300);
  });

  it("texto colado passa pela extração", async () => {
    const out = await extractMaterial("text", [{ name: "a.txt", mimeType: "text/plain", data: new TextEncoder().encode("Olá mundo do estudo.") }], {
      maxPages: 100,
    });
    expect(out.pages[0].text).toBe("Olá mundo do estudo.");
  });
});

describe("validação do upload", () => {
  const f = (name: string, type: string) => ({ name, type, size: 1000 });

  it("decide o tipo do material", () => {
    expect(materialTypeFor([f("a.pdf", "application/pdf")])).toEqual({ type: "pdf" });
    expect(materialTypeFor([f("a.jpg", "image/jpeg"), f("b.png", "image/png")])).toEqual({ type: "image" });
    expect(materialTypeFor([f("a.docx", "")])).toEqual({ type: "docx" });
    expect(materialTypeFor([f("a.pdf", "application/pdf"), f("b.pdf", "application/pdf")])).toHaveProperty("error");
    expect(materialTypeFor([f("a.exe", "application/x-msdownload")])).toHaveProperty("error");
  });

  it("caminho no Storage é do servidor, dentro da pasta do usuário", () => {
    expect(storagePathFor("u1", "m1", 0, f("../../evil.pdf", "application/pdf"))).toBe("u1/m1/001.pdf");
    expect(storagePathFor("u1", "m1", 11, f("foto.PNG", "image/png"))).toBe("u1/m1/012.png");
  });
});

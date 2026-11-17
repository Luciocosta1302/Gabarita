import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extractPptx, slideXmlText } from "@/lib/ingest/extract";
import { GUIDES, WELCOME_STEPS } from "@/lib/tutorials/guides";
import { materialTypeFor } from "@/lib/validation/upload";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const sld = (body: string) => `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`;
const para = (...runs: string[]) => `<a:p>${runs.map((r) => `<a:r><a:rPr lang="pt-BR"/><a:t>${r}</a:t></a:r>`).join("")}</a:p>`;

describe("slides (PPTX)", () => {
  it("aceita um PPTX e explica o que fazer com .ppt antigo", () => {
    expect(materialTypeFor([{ name: "aula.pptx", size: 10, type: PPTX }])).toEqual({ type: "pptx" });
    expect(materialTypeFor([{ name: "aula.pptx", size: 10, type: "" }])).toEqual({ type: "pptx" });
    expect(materialTypeFor([{ name: "aula.ppt", size: 10, type: "application/vnd.ms-powerpoint" }])).toMatchObject({ error: expect.stringContaining("PPTX") });
  });

  it("junta os pedaços de cada parágrafo e decodifica entidades", () => {
    expect(slideXmlText(sld(para("Lei de ", "Ohm") + para("U = R &amp; I &#233; &#x3c0;") + "<a:p></a:p>"))).toBe("Lei de Ohm\nU = R & I é π");
  });

  it("cada slide vira uma página, em ordem numérica, com as notas", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide10.xml", sld(para("Décimo slide com bastante texto aqui")));
    zip.file("ppt/slides/slide2.xml", sld(para("Segundo slide com bastante texto aqui")));
    zip.file("ppt/notesSlides/notesSlide2.xml", sld(para("Falar do exemplo") + para("2")));
    const ex = await extractPptx(await zip.generateAsync({ type: "uint8array" }));
    expect(ex.pageCount).toBe(2);
    expect(ex.pages[0]).toEqual({ page: 1, text: "Segundo slide com bastante texto aqui\n\nNotas do slide: Falar do exemplo" });
    expect(ex.pages[1].text).toContain("Décimo");
  });

  it("slides só com imagem pedem o PDF", async () => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", sld(""));
    await expect(extractPptx(await zip.generateAsync({ type: "uint8array" }))).rejects.toThrow(/PDF/);
  });
});

describe("tutoriais", () => {
  it("todo guia tem título, apresentador, introdução e de 1 a 4 passos curtos", () => {
    for (const [id, g] of Object.entries(GUIDES)) {
      expect(id).toMatch(/^[a-z0-9-]{1,40}$/); // formato aceito por set_tutorial_seen
      expect(["mochi", "daru", "fuku"]).toContain(g.who);
      expect(g.intro.length).toBeGreaterThan(20);
      expect(g.steps.length).toBeGreaterThanOrEqual(1);
      expect(g.steps.length).toBeLessThanOrEqual(4);
      for (const s of g.steps) expect(s.length).toBeLessThan(160);
    }
  });
  it("o tour de boas-vindas apresenta os três e mostra onde adicionar material", () => {
    expect(new Set(WELCOME_STEPS.map((s) => s.who))).toEqual(new Set(["mochi", "daru", "fuku"]));
    expect(WELCOME_STEPS.some((s) => s.text.includes("Adicionar material"))).toBe(true);
  });
});

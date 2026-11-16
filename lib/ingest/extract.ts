import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";

import { generateJSON, transcribe } from "@/lib/ai/provider";
import { ocrImagePrompt, ocrPdfPrompt } from "@/lib/ai/prompts/ocr";
import { UserFacingError } from "@/lib/errors";

import { cleanText, type PageText } from "./chunk";

export type MaterialType = "pdf" | "image" | "docx" | "text" | "audio";
export type InputFile = { name: string; mimeType: string; data: Uint8Array };

/** Página com menos que isso de texto é considerada escaneada (sem camada de texto). */
const MIN_PAGE_CHARS = 40;
/** DOCX/texto não têm página: dividimos em "páginas" de ~3000 caracteres para poder citar. */
const PSEUDO_PAGE_CHARS = 3000;
const OCR_PAGES_PER_CALL = 10;

export type Extracted = { pages: PageText[]; pageCount: number };

export async function extractMaterial(
  type: MaterialType,
  files: InputFile[],
  { maxPages }: { maxPages: number },
): Promise<Extracted> {
  if (files.length === 0) throw new UserFacingError("Nenhum arquivo encontrado para este material.");
  switch (type) {
    case "pdf":
      return extractPdf(files[0].data, maxPages);
    case "image":
      if (files.length > maxPages) throw tooManyPages(files.length, maxPages);
      return extractImages(files);
    case "docx":
      return limitPages(splitPseudoPages(await extractDocx(files[0].data)), maxPages);
    case "text":
      return limitPages(splitPseudoPages(new TextDecoder().decode(files[0].data)), maxPages);
    case "audio":
      return limitPages(splitPseudoPages(await transcribeAudio(files[0])), maxPages);
  }
}

function tooManyPages(count: number, max: number) {
  return new UserFacingError(`O material tem ${count} páginas; o seu plano aceita até ${max} por material.`);
}

function limitPages(ex: Extracted, maxPages: number) {
  if (ex.pageCount > maxPages) throw tooManyPages(ex.pageCount, maxPages);
  return ex;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export async function extractPdf(data: Uint8Array, maxPages: number): Promise<Extracted> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  let pages: PageText[];
  let total: number;
  try {
    const result = await parser.getText();
    total = result.total;
    pages = result.pages.map((p) => ({ page: p.num, text: p.text }));
  } catch (e) {
    console.error("[extract] pdf-parse falhou:", e);
    throw new UserFacingError("Não foi possível ler este PDF. Ele pode estar corrompido ou protegido por senha.");
  } finally {
    await parser.destroy().catch(() => {});
  }
  if (total > maxPages) throw tooManyPages(total, maxPages);

  const empty = pages.filter((p) => cleanText(p.text).length < MIN_PAGE_CHARS).map((p) => p.page);
  if (empty.length > 0) {
    const ocr = await ocrPdfPages(data, empty);
    pages = pages.map((p) => (ocr.has(p.page) ? { page: p.page, text: ocr.get(p.page)! } : p));
  }
  return { pages, pageCount: total };
}

/** Agrupa páginas sem texto em intervalos contíguos de até 10 e transcreve com a IA (visão). */
async function ocrPdfPages(data: Uint8Array, pageNumbers: number[]) {
  const ranges: { from: number; to: number }[] = [];
  for (const n of pageNumbers) {
    const last = ranges.at(-1);
    if (last && n === last.to + 1 && n - last.from < OCR_PAGES_PER_CALL) last.to = n;
    else ranges.push({ from: n, to: n });
  }
  const base64 = Buffer.from(data).toString("base64");
  const out = new Map<number, string>();
  for (const r of ranges) {
    const { data: res } = await generateJSON({
      ...ocrPdfPrompt(r),
      documents: [{ mediaType: "application/pdf", base64 }],
    });
    for (const p of res.pages) if (p.page >= r.from && p.page <= r.to) out.set(p.page, p.text);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fotos (cada foto = uma página)
// ---------------------------------------------------------------------------

async function extractImages(files: InputFile[]): Promise<Extracted> {
  const texts = await mapLimit(files, 4, async (f) => {
    let jpeg: Buffer;
    try {
      // 1568 px no lado maior é o tamanho que a IA usa; maior só gasta mais.
      jpeg = await sharp(f.data).rotate().resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    } catch {
      throw new UserFacingError(`Não foi possível abrir a imagem "${f.name}".`);
    }
    const { data } = await generateJSON({
      ...ocrImagePrompt(),
      images: [{ mediaType: "image/jpeg", base64: jpeg.toString("base64") }],
    });
    return data.text;
  });
  return { pages: texts.map((text, i) => ({ page: i + 1, text })), pageCount: files.length };
}

// ---------------------------------------------------------------------------
// Áudio de aula (D12): transcreve e vira texto corrido
// ---------------------------------------------------------------------------

async function transcribeAudio(f: InputFile) {
  const { text } = await transcribe({ data: f.data, filename: f.name, mimeType: f.mimeType || "audio/mpeg", language: "pt" });
  if (cleanText(text).length < 20) throw new UserFacingError("Não deu para entender a fala neste áudio.");
  return text;
}

// ---------------------------------------------------------------------------
// DOCX e texto
// ---------------------------------------------------------------------------

async function extractDocx(data: Uint8Array) {
  try {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
    return value;
  } catch {
    throw new UserFacingError("Não foi possível ler este arquivo DOCX.");
  }
}

/** Divide texto corrido em páginas de ~3000 caracteres, cortando em fim de parágrafo. */
export function splitPseudoPages(text: string): Extracted {
  const paragraphs = cleanText(text).split(/\n\n+/);
  const pages: PageText[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length > PSEUDO_PAGE_CHARS) {
      pages.push({ page: pages.length + 1, text: current });
      current = "";
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  if (current.trim()) pages.push({ page: pages.length + 1, text: current });
  return { pages, pageCount: pages.length };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

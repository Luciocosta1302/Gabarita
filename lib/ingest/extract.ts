import "server-only";

import JSZip from "jszip";
import mammoth from "mammoth";
import sharp from "sharp";

import { generateJSON, transcribe } from "@/lib/ai/provider";
import { ocrImagePrompt, ocrPdfPrompt } from "@/lib/ai/prompts/ocr";
import { UserFacingError } from "@/lib/errors";

import { cleanText, type PageText } from "./chunk";

export type MaterialType = "pdf" | "image" | "docx" | "pptx" | "text" | "audio";
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
    case "pptx":
      return limitPages(await extractPptx(files[0].data), maxPages);
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

/**
 * O leitor de PDF (pdf.js) só é carregado quando precisa. Em Node ele exige o @napi-rs/canvas
 * (DOMMatrix) e o arquivo do "worker"; sem eles, o import quebra e derrubava a rota inteira
 * (foi o "Erro 500" no envio em produção). O `pdf-parse/worker` carrega os dois, e os imports
 * com o nome fixo fazem a Vercel incluir esses arquivos no servidor.
 */
let pdfLib: Promise<typeof import("pdf-parse")> | null = null;
function loadPdfParse() {
  pdfLib ??= (async () => {
    await import("@napi-rs/canvas");
    await import("pdf-parse/worker");
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    return import("pdf-parse");
  })().catch((e) => {
    pdfLib = null;
    console.error("[extract] não carregou o leitor de PDF:", e);
    throw new UserFacingError("O leitor de PDF do servidor falhou ao iniciar. Tente de novo em alguns minutos; se continuar, envie as páginas como fotos.");
  });
  return pdfLib;
}

export async function extractPdf(data: Uint8Array, maxPages: number): Promise<Extracted> {
  const { PDFParse } = await loadPdfParse();
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

// ---------------------------------------------------------------------------
// Slides (PPTX): cada slide = 1 página; as notas do apresentador vão junto
// ---------------------------------------------------------------------------

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeXml(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (XML_ENTITIES[e] ?? m),
  );
}

/** Texto de um XML do PowerPoint: cada parágrafo (<a:p>) vira uma linha; os pedaços (<a:t>) se juntam. */
export function slideXmlText(xml: string) {
  return xml
    .split(/<\/a:p>/)
    .map((p) => Array.from(p.matchAll(/<a:t(?:\s[^>]*)?>([^<]*)<\/a:t>/g), (m) => decodeXml(m[1])).join(""))
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export async function extractPptx(data: Uint8Array): Promise<Extracted> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new UserFacingError("Não foi possível ler estes slides. Salve como PPTX ou PDF e envie de novo.");
  }
  const num = (name: string) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => num(a) - num(b));
  if (slides.length === 0) throw new UserFacingError("Não encontramos slides neste arquivo.");

  const pages: PageText[] = [];
  for (const [i, name] of slides.entries()) {
    const text = slideXmlText(await zip.file(name)!.async("string"));
    const notesFile = zip.file(`ppt/notesSlides/notesSlide${num(name)}.xml`);
    // nas notas, o número do slide também aparece como texto: tiramos linhas só com dígitos
    const notes = notesFile ? slideXmlText(await notesFile.async("string")).split("\n").filter((l) => !/^\d+$/.test(l)).join("\n") : "";
    pages.push({ page: i + 1, text: [text, notes && `Notas do slide: ${notes}`].filter(Boolean).join("\n\n") });
  }
  if (pages.every((p) => cleanText(p.text).length < 20)) {
    throw new UserFacingError("Estes slides são só imagens, sem texto. Exporte como PDF (Arquivo → Exportar → PDF) e envie o PDF: aí a IA lê as imagens.");
  }
  return { pages, pageCount: pages.length };
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

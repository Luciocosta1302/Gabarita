import "server-only";

import { transcribeVideo } from "@/lib/ai/provider";
import { UserFacingError } from "@/lib/errors";
import { MAX_PAGES } from "@/lib/limits";
import type { AdminClient } from "@/lib/supabase/admin";

import { chunkPages } from "./chunk";
import { embedTexts, toPgVector } from "./embed";
import { type Extracted, extractMaterial, extractPdf, type InputFile, type MaterialType, splitPseudoPages } from "./extract";
import { youtubeId, youtubeWatchUrl } from "./html";
import { fetchLink, youtubeTitle } from "./links";

export const MATERIALS_BUCKET = "materials";
const INSERT_BATCH = 100;

/**
 * Processa um material: baixa os arquivos → extrai texto por página → divide em trechos
 * → embeddings → salva os trechos. Idempotente: se rodar de novo, substitui os trechos.
 */
export async function ingestMaterial(admin: AdminClient, materialId: string) {
  const { data: material, error } = await admin
    .from("materials")
    .select("id, user_id, subject_id, type, storage_path, source_url, title")
    .eq("id", materialId)
    .single();
  if (error || !material) throw new UserFacingError("Material não encontrado.");
  if (!material.storage_path) throw new UserFacingError("Material sem arquivo.");
  if (!["pdf", "image", "docx", "pptx", "text", "audio", "web", "youtube"].includes(material.type)) {
    throw new UserFacingError("Este tipo de material ainda não é suportado.");
  }

  await admin.from("materials").update({ status: "processing", error: null }).eq("id", materialId);


  const { pages, pageCount } =
    material.type === "web" || material.type === "youtube"
      ? await extractLink(admin, material)
      : await extractMaterial(material.type as MaterialType, await downloadFolder(admin, material.storage_path), { maxPages: MAX_PAGES });

  const chunks = chunkPages(pages);
  if (chunks.length === 0) throw new UserFacingError("Não encontramos texto neste material.");

  const embeddings = await embedTexts(chunks.map((c) => c.content));

  const { error: delError } = await admin.from("chunks").delete().eq("material_id", materialId);
  if (delError) throw delError;

  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const rows = chunks.slice(i, i + INSERT_BATCH).map((c, j) => ({
      user_id: material.user_id,
      material_id: material.id,
      subject_id: material.subject_id,
      content: c.content,
      page: c.page,
      page_breaks: c.breaks,
      chunk_index: c.index,
      embedding: toPgVector(embeddings[i + j]),
    }));
    const { error: insError } = await admin.from("chunks").insert(rows);
    if (insError) throw insError;
  }

  await admin.from("materials").update({ status: "ready", page_count: pageCount, error: null }).eq("id", materialId);
  return { chunks: chunks.length, pages: pageCount };
}

type LinkMaterial = { id: string; type: string; storage_path: string | null; source_url: string | null; title: string };

/**
 * Link: página da web (texto ou PDF por link) ou vídeo do YouTube (transcrito pela IA).
 * Sem título dado pelo aluno (título = o próprio link), usa o título da página/vídeo.
 */
async function extractLink(admin: AdminClient, m: LinkMaterial): Promise<Extracted> {
  if (!m.source_url) throw new UserFacingError("Material sem link.");
  let ex: Extracted;
  let title: string | null = null;
  if (m.type === "youtube") {
    const id = youtubeId(m.source_url);
    if (!id) throw new UserFacingError("Link do YouTube inválido.");
    const url = youtubeWatchUrl(id);
    const [{ text }, t] = await Promise.all([transcribeVideo(url), youtubeTitle(url)]);
    if (text.replace(/\[[\d:]+\]/g, "").trim().length < 50) throw new UserFacingError("Não deu para entender a fala neste vídeo.");
    ex = splitPseudoPages(text);
    // sem o título (oEmbed fora do ar), um nome legível no lugar do link
    title = t ?? `Vídeo do YouTube (${id})`;
  } else {
    const got = await fetchLink(m.source_url);
    if (got.kind === "pdf") {
      // guarda o PDF para o "Abrir PDF original" funcionar como num upload
      if (m.storage_path) {
        await admin.storage.from(MATERIALS_BUCKET).upload(`${m.storage_path}/001.pdf`, got.data, { contentType: "application/pdf", upsert: true });
      }
      ex = await extractPdf(got.data, MAX_PAGES);
      await admin.from("materials").update({ type: "pdf" }).eq("id", m.id);
    } else {
      if (got.text.length < 200) {
        throw new UserFacingError("Quase não há texto nessa página (ela pode exigir login ou carregar o conteúdo só no navegador). Copie o texto e cole como material.");
      }
      ex = splitPseudoPages(got.text);
      title = got.title;
    }
  }
  if (ex.pageCount > MAX_PAGES) throw new UserFacingError(`O conteúdo tem ${ex.pageCount} partes; o limite é ${MAX_PAGES} por material.`);
  if (title && m.title === m.source_url.slice(0, 200)) await admin.from("materials").update({ title }).eq("id", m.id);
  return ex;
}

export async function markMaterialFailed(admin: AdminClient, materialId: string, message: string) {
  await admin.from("materials").update({ status: "error", error: message }).eq("id", materialId);
}

/** Baixa todos os arquivos da pasta do material, em ordem de nome (001-..., 002-...). */
export async function downloadFolder(admin: AdminClient, folder: string): Promise<InputFile[]> {
  const prefix = folder.replace(/\/+$/, "");
  const { data: list, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  const objects = (list ?? []).filter((o) => o.id && !o.name.startsWith("."));

  const files: InputFile[] = [];
  for (const o of objects) {
    const { data: blob, error: dlError } = await admin.storage.from(MATERIALS_BUCKET).download(`${prefix}/${o.name}`);
    if (dlError || !blob) throw dlError ?? new Error(`Falha ao baixar ${o.name}`);
    files.push({ name: o.name, mimeType: blob.type, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  return files;
}

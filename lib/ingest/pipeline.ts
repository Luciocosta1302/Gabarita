import "server-only";

import { UserFacingError } from "@/lib/errors";
import { maxPagesFor, type Plan } from "@/lib/limits";
import type { AdminClient } from "@/lib/supabase/admin";

import { chunkPages } from "./chunk";
import { embedTexts, toPgVector } from "./embed";
import { extractMaterial, type InputFile, type MaterialType } from "./extract";

export const MATERIALS_BUCKET = "materials";
const INSERT_BATCH = 100;

/**
 * Processa um material: baixa os arquivos → extrai texto por página → divide em trechos
 * → embeddings → salva os trechos. Idempotente: se rodar de novo, substitui os trechos.
 */
export async function ingestMaterial(admin: AdminClient, materialId: string) {
  const { data: material, error } = await admin
    .from("materials")
    .select("id, user_id, subject_id, type, storage_path")
    .eq("id", materialId)
    .single();
  if (error || !material) throw new UserFacingError("Material não encontrado.");
  if (!material.storage_path) throw new UserFacingError("Material sem arquivo.");
  if (!["pdf", "image", "docx", "text"].includes(material.type)) {
    throw new UserFacingError("Este tipo de material ainda não é suportado.");
  }

  await admin.from("materials").update({ status: "processing", error: null }).eq("id", materialId);

  const { data: profile } = await admin.from("profiles").select("plan").eq("id", material.user_id).single();
  const maxPages = maxPagesFor((profile?.plan ?? "free") as Plan);

  const files = await downloadFolder(admin, material.storage_path);
  const { pages, pageCount } = await extractMaterial(material.type as MaterialType, files, { maxPages });

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
      chunk_index: c.index,
      embedding: toPgVector(embeddings[i + j]),
    }));
    const { error: insError } = await admin.from("chunks").insert(rows);
    if (insError) throw insError;
  }

  await admin.from("materials").update({ status: "ready", page_count: pageCount, error: null }).eq("id", materialId);
  return { chunks: chunks.length, pages: pageCount };
}

export async function markMaterialFailed(admin: AdminClient, materialId: string, message: string) {
  await admin.from("materials").update({ status: "error", error: message }).eq("id", materialId);
}

/** Baixa todos os arquivos da pasta do material, em ordem de nome (001-..., 002-...). */
async function downloadFolder(admin: AdminClient, folder: string): Promise<InputFile[]> {
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

import { after, NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { todayBR } from "@/lib/dates";
import { MAX_MEDIA_PER_DAY } from "@/lib/limits";
import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { youtubeId, youtubeWatchUrl } from "@/lib/ingest/html";
import { createUploadSchema, materialTypeFor, storagePathFor } from "@/lib/validation/upload";

export const maxDuration = 300;

/**
 * Cria o material.
 * - Arquivos: devolve os caminhos para o navegador enviar direto ao Storage (não passa pelo servidor);
 *   depois o navegador chama /api/upload/complete.
 * - Texto colado: salva no Storage e já enfileira o processamento.
 */
export const POST = apiRoute(createUploadSchema, async (input, { supabase, user }) => {
  const { data: subject } = await supabase.from("subjects").select("id").eq("id", input.subject_id).maybeSingle();
  if (!subject) return jsonError("Matéria não encontrada.", 404);


  // cota grátis da IA: vídeos e áudios são os pedidos mais caros, então há um limite por dia
  const isMedia = input.kind === "link" ? youtubeId(input.url) !== null : input.kind === "files" && (materialTypeFor(input.files) as { type?: string }).type === "audio";
  if (isMedia) {
    const since = new Date(`${todayBR()}T00:00:00-03:00`).toISOString();
    const { count } = await supabase
      .from("materials")
      .select("id", { count: "exact", head: true })
      .in("type", ["youtube", "audio"])
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_MEDIA_PER_DAY) {
      return jsonError(
        `Você já enviou ${MAX_MEDIA_PER_DAY} vídeos/áudios hoje, o limite diário (a IA gratuita é dividida entre todos). Amanhã libera de novo; PDF, slides, fotos e texto continuam liberados.`,
        429,
      );
    }
  }

  const materialId = crypto.randomUUID();
  const folder = `${user.id}/${materialId}`;

  if (input.kind === "link") {
    // YouTube vira transcrição pela IA; o resto é buscado como página (ou PDF) no processamento
    const yt = youtubeId(input.url);
    const url = yt ? youtubeWatchUrl(yt) : input.url;
    const { error } = await supabase.from("materials").insert({
      id: materialId,
      user_id: user.id,
      subject_id: input.subject_id,
      type: yt ? "youtube" : "web",
      // sem título: fica o link até o processamento achar o título da página/vídeo
      title: (input.title || url).slice(0, 200),
      source_url: url,
      storage_path: folder,
    });
    if (error) throw error;
    await enqueueJob(supabase, user.id, "ingest_material", { material_id: materialId });
    after(() => runJobs({ userId: user.id }));
    return NextResponse.json({ material_id: materialId, uploads: [] }, { status: 201 });
  }

  if (input.kind === "text") {
    const pastExam = input.purpose === "past_exam";
    const { error } = await supabase.from("materials").insert({
      id: materialId,
      user_id: user.id,
      subject_id: input.subject_id,
      type: pastExam ? "past_exam" : "text",
      title: input.title,
      storage_path: folder,
    });
    if (error) throw error;
    const { error: upError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(`${folder}/001.txt`, new Blob([input.text], { type: "text/plain; charset=utf-8" }));
    if (upError) throw upError;
    await enqueueJob(supabase, user.id, pastExam ? "analyze_past_exam" : "ingest_material", { material_id: materialId });
    after(() => runJobs({ userId: user.id }));
    return NextResponse.json({ material_id: materialId, uploads: [] }, { status: 201 });
  }

  const kind = materialTypeFor(input.files);
  if ("error" in kind) return jsonError(kind.error, 400);

  const title =
    input.title ||
    (kind.type === "image"
      ? `Fotos (${input.files.length}) — ${new Date().toLocaleDateString("pt-BR")}`
      : input.files[0].name.replace(/\.[^.]+$/, ""));

  const { error } = await supabase.from("materials").insert({
    id: materialId,
    user_id: user.id,
    subject_id: input.subject_id,
    type: input.purpose === "past_exam" ? "past_exam" : kind.type,
    title: title.slice(0, 200),
    storage_path: folder,
  });
  if (error) throw error;

  const uploads = input.files.map((f, i) => ({ name: f.name, path: storagePathFor(user.id, materialId, i, f) }));
  return NextResponse.json({ material_id: materialId, uploads }, { status: 201 });
}, { ai: true });

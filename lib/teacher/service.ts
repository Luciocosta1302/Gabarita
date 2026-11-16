import "server-only";

import { generateJSON } from "@/lib/ai/provider";
import { teacherProfilePrompt } from "@/lib/ai/prompts/teacher";
import { UserFacingError } from "@/lib/errors";
import { extractMaterial, type MaterialType } from "@/lib/ingest/extract";
import { downloadFolder } from "@/lib/ingest/pipeline";
import { MAX_PAGES } from "@/lib/limits";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

import { mapLikelyTopics } from "./logic";

function formatOf(fileName: string): MaterialType {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "txt") return "text";
  return "image";
}

/** D4 — extrai o texto de uma prova antiga e refaz o perfil do professor da matéria. Roda no job. */
export async function analyzePastExam(admin: AdminClient, materialId: string) {
  const { data: m } = await admin.from("materials").select("id, user_id, subject_id, storage_path, type").eq("id", materialId).single();
  if (!m || m.type !== "past_exam" || !m.storage_path) throw new UserFacingError("Prova não encontrada.");
  await admin.from("materials").update({ status: "processing", error: null }).eq("id", materialId);

  const files = await downloadFolder(admin, m.storage_path);
  if (!files.length) throw new UserFacingError("Nenhum arquivo encontrado para esta prova.");
  const { pages, pageCount } = await extractMaterial(formatOf(files[0].name), files, { maxPages: MAX_PAGES });
  const text = pages.map((p) => p.text).join("\n\n").trim();
  if (text.length < 50) throw new UserFacingError("Não encontramos texto nesta prova.");

  await admin.from("materials").update({ extracted_text: text, page_count: pageCount }).eq("id", materialId);
  await rebuildTeacherProfile(admin, m.subject_id);
  await admin.from("materials").update({ status: "ready" }).eq("id", materialId);
}

/** Refaz o perfil olhando todas as provas antigas da matéria. */
export async function rebuildTeacherProfile(admin: AdminClient, subjectId: string) {
  const [{ data: subject }, { data: exams }, { data: topics }] = await Promise.all([
    admin.from("subjects").select("user_id").eq("id", subjectId).single(),
    admin
      .from("materials")
      .select("title, extracted_text")
      .eq("subject_id", subjectId)
      .eq("type", "past_exam")
      .not("extracted_text", "is", null)
      .order("created_at"),
    admin.from("topics").select("id, name").eq("subject_id", subjectId).order("position"),
  ]);
  if (!subject || !exams?.length) return null;

  const { data } = await generateJSON(
    teacherProfilePrompt({
      exams: exams.map((e) => ({ title: e.title, text: e.extracted_text! })),
      topics: topics ?? [],
    }),
  );
  const likely = mapLikelyTopics(data, topics ?? []);
  const { error } = await admin.from("teacher_profiles").upsert(
    {
      user_id: subject.user_id,
      subject_id: subjectId,
      style_json: data as unknown as NonNullable<Json>,
      likely_topics_json: likely as unknown as NonNullable<Json>,
      exams_count: exams.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subject_id" },
  );
  if (error) throw error;
  return data;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertCanAddMaterial, assertQuestionQuota } from "@/lib/billing/limits";
import { UserFacingError } from "@/lib/errors";
import { simuladoStyle, STYLE_SPECS } from "@/lib/exam-styles";
import { createQuestions, pickSources } from "@/lib/generate/questions";
import { isCorrect } from "@/lib/quiz/options";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type RoomQuestion = { id: string; stem: string; options: string[]; source_page: number | null };
export type RoomKey = Record<string, { answer: string; explanation: string | null }>;

async function assertMember(db: DB, roomId: string) {
  const { data } = await db.from("rooms").select("id").eq("id", roomId).maybeSingle();
  if (!data) throw new UserFacingError("Você não está nessa sala.");
}

/** D14 — cria a sala (o dono entra como membro pelo gatilho do banco). */
export async function createRoom(db: DB, userId: string, input: { name: string; subjectId?: string }) {
  const { data, error } = await db
    .from("rooms")
    .insert({ owner_id: userId, name: input.name, subject_id: input.subjectId ?? null })
    .select("id, invite_code")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao criar a sala");
  return data;
}

export async function joinRoom(db: DB, code: string) {
  const { data, error } = await db.rpc("join_room", { p_code: code });
  if (error) throw error;
  if (!data) throw new UserFacingError("Código de sala inválido.");
  return data;
}

export async function shareMaterial(db: DB, userId: string, roomId: string, materialId: string) {
  await assertMember(db, roomId);
  const { data: m } = await db.from("materials").select("id, title, status, type").eq("id", materialId).maybeSingle();
  if (!m || m.status !== "ready" || m.type === "past_exam") throw new UserFacingError("Escolha um material seu que já esteja pronto.");
  const { error } = await db.from("room_materials").upsert(
    { room_id: roomId, material_id: m.id, shared_by: userId, title: m.title },
    { onConflict: "room_id,material_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/**
 * Importa para uma matéria minha um material que um colega compartilhou na sala: o servidor copia os
 * trechos (com embeddings) — o conteúdo do colega nunca fica exposto diretamente. Conta no limite de materiais.
 */
export async function importMaterial(db: DB, userId: string, input: { roomMaterialId: string; subjectId: string }) {
  const { data: shared } = await db.from("room_materials").select("id, material_id, title").eq("id", input.roomMaterialId).maybeSingle();
  if (!shared) throw new UserFacingError("Material não encontrado na sala.");
  const { data: subject } = await db.from("subjects").select("id").eq("id", input.subjectId).maybeSingle();
  if (!subject) throw new UserFacingError("Matéria não encontrada.");
  await assertCanAddMaterial(db, userId);

  const admin = createAdminClient();
  const { data: src } = await admin.from("materials").select("type, title, page_count").eq("id", shared.material_id).single();
  const { data: chunks } = await admin
    .from("chunks")
    .select("content, page, chunk_index, embedding")
    .eq("material_id", shared.material_id)
    .order("chunk_index")
    .limit(5000);
  if (!src || !chunks?.length) throw new UserFacingError("Esse material está vazio.");

  const { data: copy, error } = await admin
    .from("materials")
    .insert({ user_id: userId, subject_id: input.subjectId, type: src.type, title: `${src.title} (da turma)`, status: "ready", page_count: src.page_count })
    .select("id")
    .single();
  if (error || !copy) throw error ?? new Error("Falha ao importar");
  for (let i = 0; i < chunks.length; i += 100) {
    const { error: e } = await admin.from("chunks").insert(
      chunks.slice(i, i + 100).map((c) => ({ ...c, user_id: userId, material_id: copy.id, subject_id: input.subjectId })),
    );
    if (e) throw e;
  }
  await admin.from("jobs").insert({ user_id: userId, kind: "cluster_topics", payload_json: { subject_id: input.subjectId } });
  return copy.id;
}

/**
 * Simulado da turma: quem cria usa uma matéria SUA como fonte. Enunciados e alternativas ficam visíveis
 * aos membros; o gabarito fica numa tabela que só o servidor lê.
 */
export async function createRoomQuiz(db: DB, userId: string, input: { roomId: string; subjectId: string; count: number; style?: string }) {
  await assertMember(db, input.roomId);
  await assertQuestionQuota(db, userId, input.count);
  const style = simuladoStyle(input.style);
  const sources = await pickSources(db, { subjectId: input.subjectId, count: input.count });
  const inserted = await createQuestions(db, userId, { subjectId: input.subjectId, sources, count: input.count, difficulty: "misturada", style, origin: "quiz" });
  const { data: qs } = await db.from("questions").select("id, stem, options_json, answer, explanation, source_page").in("id", inserted.map((r) => r.id));
  const byId = new Map((qs ?? []).map((q) => [q.id, q]));
  const ordered = inserted.map((r) => byId.get(r.id)!).filter(Boolean);

  const publicQs: RoomQuestion[] = ordered.map((q) => ({ id: q.id, stem: q.stem, options: (q.options_json as string[]) ?? [], source_page: q.source_page }));
  const key: RoomKey = Object.fromEntries(ordered.map((q) => [q.id, { answer: q.answer, explanation: q.explanation }]));
  const { data: subject } = await db.from("subjects").select("name").eq("id", input.subjectId).single();

  const admin = createAdminClient();
  const { data: rq, error } = await admin
    .from("room_quizzes")
    .insert({
      room_id: input.roomId,
      created_by: userId,
      title: `${subject?.name ?? "Simulado"} — ${publicQs.length} questões`,
      questions_json: publicQs as unknown as NonNullable<Json>,
      time_limit_s: Math.round(publicQs.length * STYLE_SPECS[style].minutesPerQuestion * 60),
    })
    .select("id")
    .single();
  if (error || !rq) throw error ?? new Error("Falha ao criar o simulado da sala");
  const { error: keyError } = await admin.from("room_quiz_keys").insert({ room_quiz_id: rq.id, answers_json: key as unknown as NonNullable<Json> });
  if (keyError) throw keyError;
  return rq.id;
}

/** Corrige o simulado da turma (uma tentativa por pessoa) e grava para o ranking. */
export async function submitRoomQuiz(db: DB, userId: string, input: { roomQuizId: string; answers: Record<string, string | null>; timeMs: number }) {
  const { data: rq } = await db.from("room_quizzes").select("id, room_id, questions_json").eq("id", input.roomQuizId).maybeSingle();
  if (!rq) throw new UserFacingError("Simulado não encontrado.");
  const admin = createAdminClient();
  const { data: existing } = await admin.from("room_attempts").select("correct, total").eq("room_quiz_id", rq.id).eq("user_id", userId).maybeSingle();
  if (existing) return existing;

  const { data: k } = await admin.from("room_quiz_keys").select("answers_json").eq("room_quiz_id", rq.id).single();
  const key = (k?.answers_json ?? {}) as RoomKey;
  const questions = rq.questions_json as unknown as RoomQuestion[];
  const correct = questions.filter((q) => {
    const a = input.answers[q.id];
    return !!a && !!key[q.id] && isCorrect(a, key[q.id].answer);
  }).length;
  const { error } = await admin.from("room_attempts").insert({
    room_quiz_id: rq.id,
    room_id: rq.room_id,
    user_id: userId,
    correct,
    total: questions.length,
    time_ms: input.timeMs,
    answers_json: input.answers as unknown as NonNullable<Json>,
  });
  if (error && error.code !== "23505") throw error;
  return { correct, total: questions.length };
}

/** Gabarito do simulado da turma — só para quem já entregou. */
export async function roomQuizKeyFor(userId: string, roomQuizId: string) {
  const admin = createAdminClient();
  const { data: done } = await admin.from("room_attempts").select("answers_json").eq("room_quiz_id", roomQuizId).eq("user_id", userId).maybeSingle();
  if (!done) return null;
  const { data: k } = await admin.from("room_quiz_keys").select("answers_json").eq("room_quiz_id", roomQuizId).single();
  return { key: (k?.answers_json ?? {}) as RoomKey, mine: done.answers_json as Record<string, string | null> };
}

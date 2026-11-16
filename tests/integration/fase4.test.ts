import { beforeAll, describe, expect, it } from "vitest";

import { cachedEmbed } from "@/lib/ai/embed-cache";
import { generateJSON } from "@/lib/ai/provider";
import { flashcardsPrompt } from "@/lib/ai/prompts/flashcards";
import { withUsage } from "@/lib/ai/usage";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { createRoom, createRoomQuiz, importMaterial, joinRoom, roomQuizKeyFor, shareMaterial, submitRoomQuiz, type RoomQuestion } from "@/lib/rooms/service";
import { createAdminClient } from "@/lib/supabase/admin";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
let ana: U;
let beto: U;
let caio: U;
let anaSubject: string;
let betoSubject: string;
let anaMaterial: string;

async function subjectWithMaterial(u: U, name: string) {
  const { data: s } = await u.client.from("subjects").insert({ user_id: u.user.id, name }).select("id").single();
  const id = crypto.randomUUID();
  await u.client.storage.from("materials").upload(`${u.user.id}/${id}/001.pdf`, makePdf(studyPages(8)), { contentType: "application/pdf" });
  await u.client.from("materials").insert({ id, user_id: u.user.id, subject_id: s!.id, type: "pdf", title: name, storage_path: `${u.user.id}/${id}` });
  await enqueueJob(u.client, u.user.id, "ingest_material", { material_id: id });
  await runJobs({ userId: u.user.id });
  return { subjectId: s!.id, materialId: id };
}

beforeAll(async () => {
  ana = await newUser("ana5");
  beto = await newUser("beto5");
  caio = await newUser("caio5");
  ({ subjectId: anaSubject, materialId: anaMaterial } = await subjectWithMaterial(ana, "Biologia"));
  const { data: s } = await beto.client.from("subjects").insert({ user_id: beto.user.id, name: "Bio do Beto" }).select("id").single();
  betoSubject = s!.id;
});

describe("salas da turma (D14)", () => {
  let roomId: string;
  let code: string;
  let rqId: string;

  it("dono cria a sala e já é membro; colega entra pelo código; quem não entrou não vê nada", async () => {
    const room = await createRoom(ana.client, ana.user.id, { name: "Turma A", subjectId: anaSubject });
    code = room.invite_code;
    roomId = (await ana.client.from("rooms").select("id").eq("invite_code", code).single()).data!.id;
    expect((await caio.client.from("rooms").select("id")).data).toEqual([]);
    expect(await joinRoom(beto.client, code.toUpperCase())).toBe(roomId);
    const { data: members } = await beto.client.rpc("room_member_names", { p_room_id: roomId });
    expect(members!.map((m) => m.name).sort()).toEqual(["ana5", "beto5"]);
    await expect(joinRoom(beto.client, "codigo-errado")).rejects.toThrow("inválido");
    expect((await caio.client.rpc("room_member_names", { p_room_id: roomId })).data).toEqual([]);
  });

  it("Ana compartilha o material; Beto importa para a matéria dele (trechos copiados)", async () => {
    await shareMaterial(ana.client, ana.user.id, roomId, anaMaterial);
    const { data: shared } = await beto.client.from("room_materials").select("id, title").eq("room_id", roomId).single();
    expect(shared!.title).toBe("Biologia");
    // Beto não lê o material da Ana diretamente
    expect((await beto.client.from("chunks").select("id").eq("material_id", anaMaterial)).data).toEqual([]);
    const copyId = await importMaterial(beto.client, beto.user.id, { roomMaterialId: shared!.id, subjectId: betoSubject });
    const [{ count: original }, { count: copied }] = await Promise.all([
      admin.from("chunks").select("id", { count: "exact", head: true }).eq("material_id", anaMaterial),
      beto.client.from("chunks").select("id", { count: "exact", head: true }).eq("material_id", copyId),
    ]);
    expect(copied).toBe(original);
    // e não dá para compartilhar material dos outros
    await expect(shareMaterial(beto.client, beto.user.id, roomId, anaMaterial)).rejects.toThrow();
  });

  it("simulado da turma: membros veem as questões mas não o gabarito; corrigido no servidor; uma tentativa", async () => {
    rqId = await createRoomQuiz(ana.client, ana.user.id, { roomId, subjectId: anaSubject, count: 4 });
    const { data: rq } = await beto.client.from("room_quizzes").select("questions_json").eq("id", rqId).single();
    const qs = rq!.questions_json as unknown as RoomQuestion[];
    expect(qs).toHaveLength(4);
    expect(JSON.stringify(qs)).not.toContain('"answer"');
    expect((await beto.client.from("room_quiz_keys").select("*")).data).toEqual([]);
    expect(await roomQuizKeyFor(beto.user.id, rqId)).toBeNull();

    const key = (await admin.from("room_quiz_keys").select("answers_json").eq("room_quiz_id", rqId).single()).data!.answers_json as Record<string, { answer: string }>;
    const answers = Object.fromEntries(qs.map((q, i) => [q.id, i < 3 ? key[q.id].answer : null]));
    expect(await submitRoomQuiz(beto.client, beto.user.id, { roomQuizId: rqId, answers, timeMs: 60_000 })).toEqual({ correct: 3, total: 4 });
    // segunda entrega não muda nada
    const all = Object.fromEntries(qs.map((q) => [q.id, key[q.id].answer]));
    expect(await submitRoomQuiz(beto.client, beto.user.id, { roomQuizId: rqId, answers: all, timeMs: 1 })).toEqual({ correct: 3, total: 4 });
    expect((await roomQuizKeyFor(beto.user.id, rqId))!.key).toBeTruthy();
    // Beto não grava tentativa direto (só o servidor)
    const { error } = await beto.client.from("room_attempts").insert({ room_quiz_id: rqId, room_id: roomId, user_id: beto.user.id, correct: 99, total: 4 });
    expect(error).not.toBeNull();
  });

  it("ranking semanal soma simulados da sala + acertos próprios", async () => {
    const { data: q } = await ana.client.from("questions").select("id, subject_id, answer, explanation, chunk_id, source_page").eq("user_id", ana.user.id).limit(1).single();
    await ana.client.from("attempts").insert({ user_id: ana.user.id, question_id: q!.id, answer: q!.answer, correct: true });
    const { data: ranking } = await beto.client.rpc("room_weekly_ranking", { p_room_id: roomId });
    expect(ranking!.map((r) => [r.name, Number(r.points)])).toEqual([
      ["beto5", 3],
      ["ana5", 1],
    ]);
    expect((await caio.client.rpc("room_weekly_ranking", { p_room_id: roomId })).data).toEqual([]);
  });
});

describe("controle de custo", () => {
  it("tokens de IA são somados por usuário/dia", async () => {
    await withUsage(caio.user.id, async () => {
      await generateJSON(flashcardsPrompt({ chunks: [{ id: "c", page: 1, content: "A fotossíntese ocorre nos cloroplastos." }], count: 1 }));
      await generateJSON(flashcardsPrompt({ chunks: [{ id: "c", page: 1, content: "A fotossíntese ocorre nos cloroplastos." }], count: 1 }));
    });
    const { data } = await caio.client.from("ai_usage").select("calls, input_tokens").single();
    expect(data!.calls).toBe(2);
    expect(Number(data!.input_tokens)).toBeGreaterThan(0);
  });

  it("cache de embeddings: o mesmo texto não vai de novo para a IA", async () => {
    const text = `texto único ${crypto.randomUUID()}`;
    const [a] = await cachedEmbed([text]);
    const before = (await admin.from("embedding_cache").select("key", { count: "exact", head: true })).count;
    const [b] = await cachedEmbed([text]);
    const after = (await admin.from("embedding_cache").select("key", { count: "exact", head: true })).count;
    expect(after).toBe(before);
    expect(b.slice(0, 5)).toEqual(a.slice(0, 5).map((x) => expect.closeTo(x, 5)));
    expect((await caio.client.from("embedding_cache").select("key")).data).toEqual([]);
  });
});

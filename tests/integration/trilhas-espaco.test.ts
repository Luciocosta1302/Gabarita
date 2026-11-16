import { beforeAll, describe, expect, it } from "vitest";

import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { answerStep, askTutor, continueStep, createPath, openQuestionId, startStep } from "@/lib/paths/service";
import { focusStats } from "@/lib/focus/stats";
import { createAdminClient } from "@/lib/supabase/admin";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
let ana: U;
let beto: U;
let subjectId: string;
let pathId: string;

async function openQuestion(stepId: string) {
  const { data } = await ana.client
    .from("tutor_messages")
    .select("kind, question_id")
    .eq("step_id", stepId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect(data!.kind).toBe("question");
  const { data: q } = await admin.from("questions").select("id, answer, origin").eq("id", data!.question_id!).single();
  return q!;
}

beforeAll(async () => {
  ana = await newUser("ana3");
  beto = await newUser("beto3");
  const { data } = await ana.client.from("subjects").insert({ user_id: ana.user.id, name: "Biologia" }).select("id").single();
  subjectId = data!.id;
  const id = crypto.randomUUID();
  const folder = `${ana.user.id}/${id}`;
  await ana.client.storage.from("materials").upload(`${folder}/001.pdf`, makePdf(studyPages(10)), { contentType: "application/pdf" });
  await ana.client.from("materials").insert({ id, user_id: ana.user.id, subject_id: subjectId, type: "pdf", title: "Bio", storage_path: folder });
  await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
  await runJobs({ userId: ana.user.id });
});

describe("trilhas + tutor", () => {
  it("cria a trilha a partir dos tópicos: 1ª etapa liberada, as outras trancadas", async () => {
    pathId = await createPath(ana.client, ana.user.id, subjectId, "Entender biologia celular");
    const { data: steps } = await ana.client.from("path_steps").select("position, status, topic_ids, prerequisites").eq("path_id", pathId).order("position");
    expect(steps!.length).toBeGreaterThan(1);
    expect(steps![0].status).toBe("available");
    expect(steps!.slice(1).every((s) => s.status === "locked")).toBe(true);
    expect(steps!.every((s) => s.topic_ids.length > 0)).toBe(true);
  });

  it("etapa trancada não abre", async () => {
    const { data: s2 } = await ana.client.from("path_steps").select("id").eq("path_id", pathId).eq("position", 2).single();
    await expect(startStep(ana.client, ana.user.id, s2!.id)).rejects.toThrow("Conclua as etapas anteriores");
  });

  it("errar → diagnóstico + explicação mais simples + questão fácil; 2 acertos seguidos concluem e liberam a próxima", async () => {
    const { data: s1 } = await ana.client.from("path_steps").select("id").eq("path_id", pathId).eq("position", 1).single();
    const stepId = s1!.id;
    await startStep(ana.client, ana.user.id, stepId);
    await startStep(ana.client, ana.user.id, stepId); // idempotente

    let kinds = (await ana.client.from("tutor_messages").select("kind").eq("step_id", stepId).order("created_at")).data!.map((m) => m.kind);
    expect(kinds).toEqual(["explanation", "question"]);

    // erra
    let q = await openQuestion(stepId);
    expect(q.origin).toBe("tutor");
    await answerStep(ana.client, ana.user.id, stepId, { questionId: q.id, answer: q.answer === "A" ? "B" : "A", confidence: "certeza" });
    const { data: msgs } = await ana.client.from("tutor_messages").select("kind, content_json").eq("step_id", stepId).order("created_at");
    kinds = msgs!.map((m) => m.kind);
    expect(kinds.slice(2)).toEqual(["feedback", "diagnosis", "explanation", "question"]);
    expect((msgs![4].content_json as { simpler: boolean }).simpler).toBe(true);
    const { data: easy } = await admin.from("questions").select("difficulty, chunk_id").eq("id", (await openQuestion(stepId)).id).single();
    expect(easy!.difficulty).toBe("facil");
    // a questão depois do erro é sobre o mesmo ponto (mesmo trecho) em que o aluno errou
    const { data: failed } = await admin.from("questions").select("chunk_id").eq("id", q.id).single();
    expect(easy!.chunk_id).toBe(failed!.chunk_id);

    // a resposta errada também foi para o caderno de erros (D6)
    const { count } = await ana.client.from("error_notebook").select("id", { count: "exact", head: true });
    expect(count).toBe(1);

    // responder questão que não está aberta é recusado
    await expect(answerStep(ana.client, ana.user.id, stepId, { questionId: q.id, answer: q.answer, confidence: "acho" })).rejects.toThrow("não está mais aberta");

    // acerta 2 seguidas
    for (let i = 0; i < 2; i++) {
      q = await openQuestion(stepId);
      const r = await answerStep(ana.client, ana.user.id, stepId, { questionId: q.id, answer: q.answer, confidence: "acho" });
      expect(r.passed).toBe(i === 1);
    }
    const { data: steps } = await ana.client.from("path_steps").select("position, status").eq("path_id", pathId).order("position");
    expect(steps![0].status).toBe("done");
    expect(steps![1].status).toBe("available");
    const last = (await ana.client.from("tutor_messages").select("kind").eq("step_id", stepId).order("created_at", { ascending: false }).limit(1).single()).data;
    expect(last!.kind).toBe("done");

    // etapa concluída não aceita mais respostas
    await expect(answerStep(ana.client, ana.user.id, stepId, { questionId: q.id, answer: q.answer, confidence: "acho" })).rejects.toThrow("já foi concluída");
  });

  it("dúvida livre ao tutor é respondida com o material", async () => {
    const { data: s2 } = await ana.client.from("path_steps").select("id").eq("path_id", pathId).eq("position", 2).single();
    await askTutor(ana.client, ana.user.id, s2!.id, "O que é isso?");
    const { data } = await ana.client.from("tutor_messages").select("role, kind").eq("step_id", s2!.id).order("created_at");
    expect(data).toEqual([
      { role: "student", kind: "chat" },
      { role: "tutor", kind: "chat" },
    ]);
  });

  it("dúvida no meio não fecha a questão; sem questão aberta, 'Próxima questão' cria outra", async () => {
    const { data: s2 } = await ana.client.from("path_steps").select("id").eq("path_id", pathId).eq("position", 2).single();
    const stepId = s2!.id;
    await startStep(ana.client, ana.user.id, stepId); // começa mesmo já tendo uma dúvida antes
    const qid = await openQuestionId(ana.client, stepId);
    expect(qid).not.toBeNull();
    await askTutor(ana.client, ana.user.id, stepId, "Pode dar um exemplo?");
    expect(await openQuestionId(ana.client, stepId)).toBe(qid);
    const { data: q } = await admin.from("questions").select("id, answer").eq("id", qid!).single();
    const r = await answerStep(ana.client, ana.user.id, stepId, { questionId: q!.id, answer: q!.answer, confidence: "acho" });
    expect(r.result.correct).toBe(true);
    const next = await openQuestionId(ana.client, stepId);
    expect(next).not.toBeNull();
    expect(next).not.toBe(qid);
    // questão aberta: "Próxima questão" não cria outra
    await continueStep(ana.client, ana.user.id, stepId);
    expect(await openQuestionId(ana.client, stepId)).toBe(next);
    // se a criação da questão falhou (sem questão aberta), "Próxima questão" cria
    await admin.from("tutor_messages").delete().eq("step_id", stepId).eq("question_id", next!);
    expect(await openQuestionId(ana.client, stepId)).toBeNull();
    await continueStep(ana.client, ana.user.id, stepId);
    expect(await openQuestionId(ana.client, stepId)).not.toBeNull();
  });
});

describe("espaço de estudos", () => {
  it("sessões somam minutos e contam a sequência de dias", async () => {
    for (const m of [25, 25]) await ana.client.from("study_sessions").insert({ user_id: ana.user.id, focus_minutes: m, subject_id: subjectId, scene: "quarto" });
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    await ana.client.from("study_sessions").insert({ user_id: ana.user.id, focus_minutes: 50, ended_at: yesterday });
    const s = await focusStats(ana.client);
    expect(s.totalMinutes).toBe(100);
    expect(s.todayMinutes).toBe(50);
    expect(s.streak).toBe(2);
  });
});

describe("RLS das tabelas novas", () => {
  it("Beto não vê trilhas, etapas, conversa do tutor nem sessões da Ana", async () => {
    for (const t of ["learning_paths", "path_steps", "tutor_messages", "study_sessions"] as const) {
      expect((await beto.client.from(t).select("id")).data).toEqual([]);
    }
  });
  it("Beto não cria trilha na matéria da Ana nem etapa na trilha dela", async () => {
    expect((await beto.client.from("learning_paths").insert({ user_id: beto.user.id, subject_id: subjectId, goal: "x", title: "x" })).error).not.toBeNull();
    expect((await beto.client.from("path_steps").insert({ user_id: beto.user.id, path_id: pathId, position: 99, title: "x", objective: "x" })).error).not.toBeNull();
    expect((await beto.client.from("study_sessions").insert({ user_id: beto.user.id, focus_minutes: 5, subject_id: subjectId })).error).not.toBeNull();
  });
});

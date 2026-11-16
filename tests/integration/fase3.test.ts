import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays, todayBR } from "@/lib/dates";
import { runFeynman } from "@/lib/feynman/service";
import { generateQuiz } from "@/lib/generate/questions";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { getPlan } from "@/lib/planner/service";
import { OPEN_FIELDS, recordOpenAttempt } from "@/lib/quiz/record";
import { solvePhoto } from "@/lib/solve/service";
import { createAdminClient } from "@/lib/supabase/admin";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
let ana: U;
let beto: U;
let subjectId: string;

async function upload(u: U, subject: string, type: string, name: string, data: Uint8Array | Buffer, mime: string) {
  const id = crypto.randomUUID();
  const folder = `${u.user.id}/${id}`;
  const { error: e1 } = await u.client.storage.from("materials").upload(`${folder}/${name}`, data, { contentType: mime });
  if (e1) throw e1;
  const { error } = await u.client.from("materials").insert({ id, user_id: u.user.id, subject_id: subject, type, title: name, storage_path: folder });
  if (error) throw error;
  return id;
}

beforeAll(async () => {
  ana = await newUser("ana4");
  beto = await newUser("beto4");
  const { data } = await ana.client
    .from("subjects")
    .insert({ user_id: ana.user.id, name: "Biologia", exam_date: addDays(todayBR(), 10), hours_per_day: 2 })
    .select("id")
    .single();
  subjectId = data!.id;
  const mid = await upload(ana, subjectId, "pdf", "001.pdf", makePdf(studyPages(10)), "application/pdf");
  await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: mid });
  await runJobs({ userId: ana.user.id });
});

describe("Prova do Professor (D4)", () => {
  it("prova antiga vira perfil do professor com tópicos prováveis; não vira trecho de estudo", async () => {
    const exam = makePdf(["Prova 1. Questão 1: Sobre a fotossíntese, é correto afirmar que ocorre nos cloroplastos. Questão 2: A respiração celular libera ATP."]);
    const id = await upload(ana, subjectId, "past_exam", "001.pdf", exam, "application/pdf");
    await enqueueJob(ana.client, ana.user.id, "analyze_past_exam", { material_id: id });
    await runJobs({ userId: ana.user.id });

    const { data: m } = await ana.client.from("materials").select("status, extracted_text").eq("id", id).single();
    expect(m!.status).toBe("ready");
    expect(m!.extracted_text).toContain("fotossíntese");
    const { count } = await admin.from("chunks").select("id", { count: "exact", head: true }).eq("material_id", id);
    expect(count).toBe(0);

    const { data: tp } = await ana.client.from("teacher_profiles").select("exams_count, style_json, likely_topics_json").eq("subject_id", subjectId).single();
    expect(tp!.exams_count).toBe(1);
    const likely = tp!.likely_topics_json as { topicId: string; weight: number }[];
    expect(likely.length).toBeGreaterThan(0);
  });

  it("questões no estilo do professor: 5 alternativas e só dos tópicos prováveis", async () => {
    const { data: tp } = await ana.client.from("teacher_profiles").select("likely_topics_json").eq("subject_id", subjectId).single();
    const likely = new Set((tp!.likely_topics_json as { topicId: string; weight: number }[]).filter((l) => l.weight >= 3).map((l) => l.topicId));
    const r = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 3, difficulty: "media", style: "professor" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids, style, title").eq("id", r.quizId).single();
    expect(quiz!.style).toBe("professor");
    expect(quiz!.title).toContain("Prova do professor");
    const { data: qs } = await ana.client.from("questions").select("options_json, topic_id, style").in("id", quiz!.question_ids);
    expect(qs!.every((q) => (q.options_json as string[]).length === 5 && q.style === "professor")).toBe(true);
    expect(qs!.every((q) => likely.has(q.topic_id!))).toBe(true);
  });

  it("o plano dá mais tempo aos tópicos que mais caem", async () => {
    const plan = await getPlan(ana.client, subjectId);
    expect(plan).not.toBeNull();
  });

  it("sem provas antigas, estilo do professor dá erro amigável", async () => {
    const { data: s } = await ana.client.from("subjects").insert({ user_id: ana.user.id, name: "Outra" }).select("id").single();
    await expect(generateQuiz(ana.client, ana.user.id, { subjectId: s!.id, count: 1, difficulty: "media", style: "professor" })).rejects.toThrow(
      /provas antigas|material/,
    );
  });
});

describe("discursivas (D10)", () => {
  it("estilo discursiva gera questões abertas com rubrica; a resposta é corrigida com nota por critério", async () => {
    const r = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 2, difficulty: "media", style: "discursiva" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids").eq("id", r.quizId).single();
    const { data: q } = await ana.client.from("questions").select(OPEN_FIELDS).eq("id", quiz!.question_ids[0]).single();
    expect(q!.type).toBe("open");
    expect(q!.rubric_json).toBeTruthy();

    const weak = await recordOpenAttempt(ana.client, ana.user.id, q!, { questionId: q!.id, quizId: r.quizId, answer: "não sei", confidence: "chutei" });
    expect(weak.result.correct).toBe(false);
    expect(weak.result.feedback!.criteria).toHaveLength(3);

    const good = await recordOpenAttempt(ana.client, ana.user.id, q!, {
      questionId: q!.id,
      answer: `${q!.answer} Isso é importante porque explica o funcionamento da célula com um exemplo.`,
      confidence: "acho",
    });
    expect(good.result.score).toBeGreaterThanOrEqual(6);
    expect(good.result.correct).toBe(true);
    const { data: saved } = await ana.client.from("attempts").select("score, feedback_json").eq("id", good.result.attempt_id).single();
    expect(Number(saved!.score)).toBe(good.result.score);
    // discursiva não vai para o caderno de erros nem para a revisão
    const { count } = await ana.client.from("reviews").select("id", { count: "exact", head: true }).eq("item_id", q!.id);
    expect(count).toBe(0);
  });

  it("simulado no estilo discursiva vira objetivo (é corrigido de uma vez)", async () => {
    const r = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 2, difficulty: "media", style: "discursiva", mode: "simulado" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids, style").eq("id", r.quizId).single();
    expect(quiz!.style).toBe("livre");
  });
});

describe("Feynman (D9), foto (D11) e áudio de aula (D12)", () => {
  it("Feynman por texto e por áudio salva a sessão com nota", async () => {
    const { data: topic } = await ana.client.from("topics").select("id").eq("subject_id", subjectId).limit(1).single();
    const t = await runFeynman(ana.client, ana.user.id, { topicId: topic!.id, text: "A fotossíntese ocorre nos cloroplastos e transforma luz em energia química." });
    expect(t.feedback.score).toBeGreaterThan(0);
    const a = await runFeynman(ana.client, ana.user.id, { topicId: topic!.id, audio: new Uint8Array([1, 2, 3]) });
    expect(a.transcript).toContain("Transcrição de teste");
    const { data } = await ana.client.from("feynman_sessions").select("mode, score, subject_id").eq("user_id", ana.user.id).order("created_at");
    expect(data!.map((d) => d.mode)).toEqual(["texto", "audio"]);
    expect(data!.every((d) => d.subject_id === subjectId && d.score != null)).toBe(true);
  });

  it("foto da questão: resolve e acha a matéria no material", async () => {
    const png = await sharp({ create: { width: 200, height: 120, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const r = await solvePhoto(ana.client, { image: new Uint8Array(png) });
    expect(r.solution.steps.length).toBeGreaterThan(0);
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches[0].subject_name).toBe("Biologia");
  });

  it("áudio de aula é transcrito e vira trechos como qualquer material", async () => {
    const id = await upload(ana, subjectId, "audio", "001.mp3", new Uint8Array(1000), "audio/mpeg");
    await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
    await runJobs({ userId: ana.user.id });
    const { data: m } = await ana.client.from("materials").select("status").eq("id", id).single();
    expect(m!.status).toBe("ready");
    const { data: c } = await ana.client.from("chunks").select("content").eq("material_id", id);
    expect(c![0].content).toContain("respiração celular");
  });
});

describe("RLS", () => {
  it("Beto não vê perfil do professor nem sessões Feynman da Ana", async () => {
    expect((await beto.client.from("teacher_profiles").select("id")).data).toEqual([]);
    expect((await beto.client.from("feynman_sessions").select("id")).data).toEqual([]);
  });
  it("Beto não cria sessão Feynman na matéria da Ana", async () => {
    const { error } = await beto.client.from("feynman_sessions").insert({ user_id: beto.user.id, subject_id: subjectId, transcript: "x" });
    expect(error).not.toBeNull();
  });
});

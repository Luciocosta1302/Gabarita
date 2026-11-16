import { beforeAll, describe, expect, it } from "vitest";

import { addDays, todayBR } from "@/lib/dates";
import { generateFlashcards } from "@/lib/generate/flashcards";
import { generateQuiz } from "@/lib/generate/questions";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { markMissed } from "@/lib/planner/plan";
import { createPlan, getPlan, updateDays } from "@/lib/planner/service";
import { QUESTION_FIELDS, recordAttempt } from "@/lib/quiz/record";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTopicStats } from "@/lib/topics/stats";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
const today = todayBR();
let ana: U;
let beto: U;
let subjectId: string;

beforeAll(async () => {
  ana = await newUser("ana2");
  beto = await newUser("beto2");
  const { data, error } = await ana.client
    .from("subjects")
    .insert({ user_id: ana.user.id, name: "Biologia", exam_date: addDays(today, 14), hours_per_day: 2 })
    .select("id")
    .single();
  if (error) throw error;
  subjectId = data.id;
});

describe("plano reverso (D2)", () => {
  it("matéria com prova daqui 14 dias gera plano de 14 dias (genérico sem material)", async () => {
    await createPlan(ana.client, ana.user.id, subjectId, today);
    const plan = await getPlan(ana.client, subjectId, today);
    expect(plan!.days).toHaveLength(14);
    expect(plan!.days[0].date).toBe(today);
    expect(plan!.days[0].tasks.some((t) => t.kind === "upload")).toBe(true);
  });

  it("dia não feito é salvo e as tarefas vão para os próximos dias", async () => {
    const before = (await getPlan(ana.client, subjectId, today))!;
    const count = (days: typeof before.days) => days.flatMap((d) => d.tasks).filter((t) => t.kind !== "review" && !t.done).length;
    await updateDays(ana.client, subjectId, (p) => markMissed(p.days, today, p.minutesPerDay));
    const after = (await getPlan(ana.client, subjectId, today))!;
    expect(after.days[0].status).toBe("missed");
    expect(count(after.days)).toBe(count(before.days));
    expect(after.days.slice(1).some((d) => d.tasks.some((t) => t.moved_from === today))).toBe(true);
  });

  it("abrir o plano dias depois reorganiza sozinho e salva", async () => {
    const later = addDays(today, 2);
    const plan = (await getPlan(ana.client, subjectId, later))!;
    expect(plan.days.find((d) => d.date === addDays(today, 1))!.status).toBe("missed");
    const { data: stored } = await ana.client.from("plan_days").select("status").eq("plan_id", plan.planId).eq("date", addDays(today, 1)).single();
    expect(stored!.status).toBe("missed");
  });
});

describe("material → tópicos (D8) → plano por tópico", () => {
  it("o job de ingestão encadeia o de tópicos, que refaz o plano", async () => {
    // plano novo e limpo para este teste
    await createPlan(ana.client, ana.user.id, subjectId, today);
    const id = crypto.randomUUID();
    const folder = `${ana.user.id}/${id}`;
    await ana.client.storage.from("materials").upload(`${folder}/001.pdf`, makePdf(studyPages(12)), { contentType: "application/pdf" });
    await ana.client.from("materials").insert({ id, user_id: ana.user.id, subject_id: subjectId, type: "pdf", title: "Bio", storage_path: folder });
    await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
    await runJobs({ userId: ana.user.id });

    const { count: loose } = await admin.from("chunks").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).is("topic_id", null);
    expect(loose).toBe(0);
    const stats = await loadTopicStats(ana.client, subjectId);
    expect(stats.length).toBeGreaterThan(1);
    expect(stats.every((t) => t.chunks > 0 && t.mastery === null)).toBe(true);

    const plan = (await getPlan(ana.client, subjectId, today))!;
    const topicTasks = plan.days.flatMap((d) => d.tasks).filter((t) => t.topic_id);
    expect(new Set(topicTasks.map((t) => t.topic_id))).toEqual(new Set(stats.map((t) => t.id)));
  });

  it("questões geradas ganham o tópico do trecho; domínio muda com as respostas", async () => {
    const stats = await loadTopicStats(ana.client, subjectId);
    const topic = stats[0];
    const { quizId } = await generateQuiz(ana.client, ana.user.id, { subjectId, topicId: topic.id, count: 2, difficulty: "media" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids, topic_id").eq("id", quizId).single();
    expect(quiz!.topic_id).toBe(topic.id);
    const { data: qs } = await ana.client.from("questions").select("id, subject_id, answer, explanation, chunk_id, source_page, topic_id").in("id", quiz!.question_ids);
    expect(qs!.every((q) => q.topic_id === topic.id)).toBe(true);

    for (const q of qs!) await recordAttempt(ana.client, ana.user.id, q, { questionId: q.id, quizId, answer: q.answer, confidence: "certeza" });
    const after = (await loadTopicStats(ana.client, subjectId)).find((t) => t.id === topic.id)!;
    expect(after.mastery).toBe(1);
    expect(after.answered).toBe(2);
  });
});

describe("revisão espaçada (D3)", () => {
  it("errar põe a questão na revisão (vence hoje); acertar depois reagenda para mais longe", async () => {
    const { quizId } = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 1, difficulty: "media" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids").eq("id", quizId).single();
    const { data: q } = await ana.client.from("questions").select(QUESTION_FIELDS).eq("id", quiz!.question_ids[0]).single();
    const wrong = q!.answer === "A" ? "B" : "A";

    await recordAttempt(ana.client, ana.user.id, q!, { questionId: q!.id, quizId, answer: wrong, confidence: "certeza" });
    const { data: r1 } = await ana.client.from("reviews").select("due_at, subject_id").eq("item_id", q!.id).single();
    expect(r1!.subject_id).toBe(subjectId);
    expect(Date.parse(r1!.due_at) - Date.now()).toBeLessThan(60 * 60_000);

    await recordAttempt(ana.client, ana.user.id, q!, { questionId: q!.id, answer: q!.answer, confidence: "acho" });
    const { data: r2 } = await ana.client.from("reviews").select("due_at").eq("item_id", q!.id).single();
    expect(Date.parse(r2!.due_at)).toBeGreaterThan(Date.parse(r1!.due_at));
  });

  it("acertar uma questão que nunca errou não entra na revisão", async () => {
    const { quizId } = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 1, difficulty: "media" });
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids").eq("id", quizId).single();
    const { data: q } = await ana.client.from("questions").select(QUESTION_FIELDS).eq("id", quiz!.question_ids[0]).single();
    await recordAttempt(ana.client, ana.user.id, q!, { questionId: q!.id, quizId, answer: q!.answer, confidence: "acho" });
    const { data } = await ana.client.from("reviews").select("id").eq("item_id", q!.id);
    expect(data).toEqual([]);
  });

  it("flashcards novos entram na fila de revisão", async () => {
    const { count } = await generateFlashcards(ana.client, ana.user.id, { subjectId, count: 3 });
    const { data } = await ana.client.from("reviews").select("id").eq("item_type", "flashcard").lte("due_at", new Date().toISOString());
    expect(data!.length).toBeGreaterThanOrEqual(count);
  });
});

describe("estilos de banca (D5) e simulado (D16)", () => {
  it("Cebraspe gera itens Certo/Errado; ENEM gera 5 alternativas", async () => {
    const c = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 3, difficulty: "media", style: "cebraspe" });
    const { data: cq } = await ana.client.from("quizzes").select("question_ids, style").eq("id", c.quizId).single();
    const { data: items } = await ana.client.from("questions").select("type, options_json, answer").in("id", cq!.question_ids);
    expect(cq!.style).toBe("cebraspe");
    expect(items!.every((i) => i.type === "true_false" && JSON.stringify(i.options_json) === '["Certo","Errado"]')).toBe(true);

    const e = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 2, difficulty: "media", style: "enem" });
    const { data: eq } = await ana.client.from("quizzes").select("question_ids").eq("id", e.quizId).single();
    const { data: enem } = await ana.client.from("questions").select("options_json").in("id", eq!.question_ids);
    expect(enem!.every((q) => (q.options_json as string[]).length === 5)).toBe(true);
  });

  it("simulado tem tempo de prova pela banca", async () => {
    const s = await generateQuiz(ana.client, ana.user.id, { subjectId, count: 4, difficulty: "misturada", style: "enem", mode: "simulado" });
    const { data } = await ana.client.from("quizzes").select("mode, time_limit_s, started_at").eq("id", s.quizId).single();
    expect(data).toEqual({ mode: "simulado", time_limit_s: 4 * 3 * 60, started_at: null });
  });
});

describe("RLS das partes novas", () => {
  it("Beto não vê plano, dias, tópicos nem revisões da Ana", async () => {
    for (const t of ["study_plans", "plan_days", "topics", "reviews"] as const) {
      expect((await beto.client.from(t).select("id")).data).toEqual([]);
    }
  });

  it("Beto não cria revisão apontando para a matéria da Ana", async () => {
    const { error } = await beto.client
      .from("reviews")
      .insert({ user_id: beto.user.id, subject_id: subjectId, item_type: "flashcard", item_id: crypto.randomUUID() });
    expect(error).not.toBeNull();
  });
});

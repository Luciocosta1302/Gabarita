import { beforeAll, describe, expect, it } from "vitest";

import { createErrorFollowup } from "@/lib/generate/error-followup";
import { generateQuiz } from "@/lib/generate/questions";
import { generateSummary } from "@/lib/generate/summary";
import { ingestMaterial } from "@/lib/ingest/pipeline";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { searchChunks } from "@/lib/rag/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { findQuote } from "@/lib/text/quote";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
let ana: U;
let beto: U;
let subjectId: string;
let materialId: string;

async function uploadPdf(u: U, subject: string, pages: number) {
  const id = crypto.randomUUID();
  const folder = `${u.user.id}/${id}`;
  const { error: upErr } = await u.client.storage
    .from("materials")
    .upload(`${folder}/001.pdf`, makePdf(studyPages(pages)), { contentType: "application/pdf" });
  if (upErr) throw upErr;
  const { error } = await u.client
    .from("materials")
    .insert({ id, user_id: u.user.id, subject_id: subject, type: "pdf", title: "Bio", storage_path: folder });
  if (error) throw error;
  return id;
}

beforeAll(async () => {
  ana = await newUser("ana1");
  beto = await newUser("beto1");
  const { data, error } = await ana.client
    .from("subjects")
    .insert({ user_id: ana.user.id, name: "Biologia" })
    .select("id")
    .single();
  if (error) throw error;
  subjectId = data.id;
  materialId = await uploadPdf(ana, subjectId, 20);
});

describe("ingestão", () => {
  it("PDF de 20 páginas vira trechos com página e embedding", async () => {
    const res = await ingestMaterial(admin, materialId);
    expect(res.pages).toBe(20);
    expect(res.chunks).toBeGreaterThan(5);

    const { data: m } = await ana.client.from("materials").select("status, page_count").eq("id", materialId).single();
    expect(m).toEqual({ status: "ready", page_count: 20 });

    const { data: chunks } = await ana.client
      .from("chunks")
      .select("page, chunk_index, embedding")
      .eq("material_id", materialId)
      .order("chunk_index");
    expect(chunks!.every((c) => c.page! >= 1 && c.page! <= 20 && c.embedding)).toBe(true);
    expect(chunks!.map((c) => c.chunk_index)).toEqual(chunks!.map((_, i) => i));
  });

  it("rodar de novo substitui os trechos (idempotente)", async () => {
    const { count: before } = await admin.from("chunks").select("id", { count: "exact", head: true }).eq("material_id", materialId);
    await ingestMaterial(admin, materialId);
    const { count: after } = await admin.from("chunks").select("id", { count: "exact", head: true }).eq("material_id", materialId);
    expect(after).toBe(before);
  });

  it("busca do RAG acha o trecho do assunto perguntado", async () => {
    const found = await searchChunks(ana.client, subjectId, "respiração celular mitocôndrias ATP");
    expect(found[0].content).toContain("respiração celular");
  });

  it("outro usuário não acha nada na matéria da Ana", async () => {
    const found = await searchChunks(beto.client, subjectId, "respiração celular");
    expect(found).toEqual([]);
  });
});

describe("fila de jobs", () => {
  it("processa o job de ingestão e marca como feito", async () => {
    const id = await uploadPdf(ana, subjectId, 2);
    const jobId = await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
    expect(await runJobs({ userId: ana.user.id })).toBeGreaterThanOrEqual(1);
    const { data: job } = await ana.client.from("jobs").select("status").eq("id", jobId).single();
    expect(job?.status).toBe("done");
    const { data: m } = await ana.client.from("materials").select("status").eq("id", id).single();
    expect(m?.status).toBe("ready");
  });

  it("erro permanente marca o material com a mensagem, sem tentar de novo", async () => {
    const id = crypto.randomUUID();
    await ana.client.from("materials").insert({
      id,
      user_id: ana.user.id,
      subject_id: subjectId,
      type: "pdf",
      title: "Vazio",
      storage_path: `${ana.user.id}/${id}`,
    });
    const jobId = await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
    await runJobs({ userId: ana.user.id });
    const { data: job } = await ana.client.from("jobs").select("status, attempts").eq("id", jobId).single();
    expect(job).toEqual({ status: "error", attempts: 1 });
    const { data: m } = await ana.client.from("materials").select("status, error").eq("id", id).single();
    expect(m?.status).toBe("error");
    expect(m?.error).toContain("Nenhum arquivo");
  });

  it("aluno não consegue pegar jobs da fila nem mudar o status", async () => {
    const { error } = await ana.client.rpc("claim_jobs", { n: 5 });
    expect(error).not.toBeNull();
    const { data } = await ana.client.from("jobs").update({ status: "done" }).eq("user_id", ana.user.id).select();
    expect(data).toEqual([]);
  });
});

describe("questões com fonte (D1) e caderno de erros (D6)", () => {
  let quizId: string;

  it("gera 10 questões; cada uma aponta para um trecho que contém a citação", async () => {
    const res = await generateQuiz(ana.client, ana.user.id, { subjectId, materialId, count: 10, difficulty: "misturada" });
    expect(res.count).toBe(10);
    quizId = res.quizId;

    const { data: quiz } = await ana.client.from("quizzes").select("question_ids").eq("id", quizId).single();
    const { data: qs } = await ana.client
      .from("questions")
      .select("chunk_id, source_page, source_quote, options_json, answer, chunks(content, page, material_id)")
      .in("id", quiz!.question_ids);
    expect(qs).toHaveLength(10);
    for (const q of qs!) {
      expect(q.chunks?.material_id).toBe(materialId);
      expect(q.source_page).toBe(q.chunks?.page);
      expect(findQuote(q.chunks!.content, q.source_quote!)).not.toBeNull();
      expect((q.options_json as string[]).length).toBe(4);
    }
    // 10 trechos diferentes (o material tem trechos suficientes)
    expect(new Set(qs!.map((q) => q.chunk_id)).size).toBe(10);
  });

  it("errar uma questão cria a entrada no caderno com explicação e questão parecida", async () => {
    const { data: quiz } = await ana.client.from("quizzes").select("question_ids").eq("id", quizId).single();
    const qid = quiz!.question_ids[0];
    const { data: q } = await ana.client.from("questions").select("answer, chunk_id").eq("id", qid).single();
    const wrong = q!.answer === "A" ? "B" : "A";

    const { data: attempt } = await ana.client
      .from("attempts")
      .insert({ user_id: ana.user.id, question_id: qid, quiz_id: quizId, answer: wrong, correct: false, confidence: "certeza" })
      .select("id")
      .single();
    const { data: entry } = await ana.client
      .from("error_notebook")
      .insert({ user_id: ana.user.id, attempt_id: attempt!.id })
      .select("id")
      .single();

    await createErrorFollowup(admin, entry!.id);

    const { data: done } = await ana.client
      .from("error_notebook")
      .select("why_wrong, followup_status, followup:questions!error_notebook_followup_question_id_fkey(origin, chunk_id)")
      .eq("id", entry!.id)
      .single();
    expect(done?.followup_status).toBe("ready");
    expect(done?.why_wrong).toBeTruthy();
    expect(done?.followup).toEqual({ origin: "followup", chunk_id: q!.chunk_id });
  });

  it("resumo do material cita só páginas que existem", async () => {
    const summary = await generateSummary(ana.client, ana.user.id, materialId);
    for (const s of summary.sections) for (const p of s.pages) expect(p).toBeLessThanOrEqual(20);
    const { data } = await ana.client.from("summaries").select("material_id").eq("material_id", materialId);
    expect(data).toHaveLength(1);
  });
});

describe("RLS das tabelas novas", () => {
  it("Beto não vê quizzes nem resumos da Ana", async () => {
    expect((await beto.client.from("quizzes").select("id")).data).toEqual([]);
    expect((await beto.client.from("summaries").select("id")).data).toEqual([]);
  });

  it("Beto não cria quiz na matéria da Ana", async () => {
    const { error } = await beto.client.from("quizzes").insert({ user_id: beto.user.id, subject_id: subjectId, title: "x" });
    expect(error).not.toBeNull();
  });

  it("Beto não registra tentativa no quiz da Ana usando questão própria", async () => {
    const { data: s } = await beto.client.from("subjects").insert({ user_id: beto.user.id, name: "B" }).select("id").single();
    const { data: q } = await beto.client
      .from("questions")
      .insert({ user_id: beto.user.id, subject_id: s!.id, type: "multiple_choice", stem: "x?", answer: "A" })
      .select("id")
      .single();
    const { data: anaQuiz } = await admin.from("quizzes").select("id").eq("user_id", ana.user.id).limit(1).single();
    const { error } = await beto.client
      .from("attempts")
      .insert({ user_id: beto.user.id, question_id: q!.id, quiz_id: anaQuiz!.id, answer: "A", correct: true });
    expect(error).not.toBeNull();
  });
});

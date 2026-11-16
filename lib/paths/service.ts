import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import { chatPrompt } from "@/lib/ai/prompts/chat";
import { pathPrompt, type Level } from "@/lib/ai/prompts/path";
import { sourceAt } from "@/lib/ai/prompts/sources";
import { tutorDiagnosePrompt, tutorExplainPrompt } from "@/lib/ai/prompts/tutor";
import { UserFacingError } from "@/lib/errors";
import { createQuestions, type GenChunk } from "@/lib/generate/questions";
import { letterToIndex } from "@/lib/quiz/options";
import { QUESTION_FIELDS, recordAttempt } from "@/lib/quiz/record";
import { searchChunks } from "@/lib/rag/search";
import type { Database, Json } from "@/lib/supabase/database.types";
import { loadTopicStats } from "@/lib/topics/stats";

import { applyAnswer, nextDifficulty, normalizePath, unlockSteps, type StepStatus } from "./logic";

type DB = SupabaseClient<Database>;
type MessageKind = Database["public"]["Tables"]["tutor_messages"]["Row"]["kind"];

const CHUNKS_PER_STEP = 6;

/** Monta a trilha com a IA a partir dos tópicos da matéria (D8) e salva as etapas. */
export async function createPath(db: DB, userId: string, subjectId: string, goal: string) {
  const { data: subject } = await db.from("subjects").select("id, name").eq("id", subjectId).maybeSingle();
  if (!subject) throw new UserFacingError("Matéria não encontrada.");
  const topics = (await loadTopicStats(db, subjectId)).filter((t) => t.chunks > 0);
  if (!topics.length) throw new UserFacingError("Envie um material e espere os tópicos aparecerem antes de criar uma trilha.");

  const { data } = await generateJSON(
    pathPrompt({ subjectName: subject.name, goal, topics: topics.map((t) => ({ name: t.name, summary: t.summary, mastery: t.mastery })) }),
  );
  const steps = normalizePath(data, topics.length);

  const { data: path, error } = await db
    .from("learning_paths")
    .insert({ user_id: userId, subject_id: subjectId, goal, title: data.title })
    .select("id")
    .single();
  if (error || !path) throw error ?? new Error("Falha ao criar a trilha");
  const { error: stepsError } = await db.from("path_steps").insert(
    steps.map((s) => ({
      user_id: userId,
      path_id: path.id,
      position: s.position,
      title: s.title,
      objective: s.objective,
      level: s.level,
      topic_ids: s.topicIdx.map((i) => topics[i].id),
      prerequisites: s.prerequisites,
      status: s.status,
    })),
  );
  if (stepsError) throw stepsError;
  return path.id;
}

async function loadStep(db: DB, stepId: string) {
  const { data: step } = await db
    .from("path_steps")
    .select("*, learning_paths!inner(id, subject_id, user_id)")
    .eq("id", stepId)
    .maybeSingle();
  if (!step) throw new UserFacingError("Etapa não encontrada.");
  if (step.status === "locked") throw new UserFacingError("Conclua as etapas anteriores para liberar esta.");
  return step;
}

/** Trechos do material dos tópicos da etapa (espalhados pelo tópico). */
async function stepChunks(db: DB, topicIds: string[]): Promise<GenChunk[]> {
  if (!topicIds.length) return [];
  const { data } = await db
    .from("chunks")
    .select("id, page, content, topic_id, chunk_index")
    .in("topic_id", topicIds)
    .order("chunk_index")
    .limit(200);
  const all = data ?? [];
  if (all.length <= CHUNKS_PER_STEP) return all;
  const step = all.length / CHUNKS_PER_STEP;
  return Array.from({ length: CHUNKS_PER_STEP }, (_, i) => all[Math.floor(i * step)]);
}

async function addMessage(
  db: DB,
  userId: string,
  stepId: string,
  role: "tutor" | "student",
  kind: MessageKind,
  content: Record<string, unknown>,
  questionId: string | null = null,
) {
  const { error } = await db.from("tutor_messages").insert({
    user_id: userId,
    step_id: stepId,
    role,
    kind,
    content_json: content as NonNullable<Json>,
    question_id: questionId,
  });
  if (error) throw error;
}

async function explain(db: DB, userId: string, step: Awaited<ReturnType<typeof loadStep>>, difficulty?: string) {
  const chunks = await stepChunks(db, step.topic_ids);
  if (!chunks.length) throw new UserFacingError("Esta etapa não tem trechos do material.");
  const { data } = await generateJSON(
    tutorExplainPrompt({ stepTitle: step.title, objective: step.objective, level: step.level, chunks, difficulty }),
  );
  const citations = [...new Set(data.sources)]
    .map((n) => ({ n, chunk: sourceAt(chunks, n) }))
    .filter((c) => c.chunk)
    .map((c) => ({ n: c.n, chunk_id: c.chunk!.id, page: c.chunk!.page }));
  await addMessage(db, userId, step.id, "tutor", "explanation", {
    text: data.explanation,
    key_points: data.key_points,
    example: data.example,
    citations,
    simpler: !!difficulty,
  });
  return chunks;
}

async function askQuestion(db: DB, userId: string, step: Awaited<ReturnType<typeof loadStep>>, lastCorrect: boolean | null, chunks?: GenChunk[]) {
  const pool = chunks ?? (await stepChunks(db, step.topic_ids));
  const difficulty = nextDifficulty(step.level as Level, lastCorrect, step.correct_streak);
  const [q] = await createQuestions(db, userId, {
    subjectId: step.learning_paths.subject_id,
    sources: pool,
    count: 1,
    difficulty,
    style: "livre",
    origin: "tutor",
  });
  await addMessage(db, userId, step.id, "tutor", "question", { difficulty }, q.id);
}

/** Abre a etapa: explicação + primeira questão (só na primeira vez). */
export async function startStep(db: DB, userId: string, stepId: string) {
  const step = await loadStep(db, stepId);
  const { count } = await db.from("tutor_messages").select("id", { count: "exact", head: true }).eq("step_id", stepId);
  if (count) return;
  const chunks = await explain(db, userId, step);
  await askQuestion(db, userId, step, null, chunks);
  if (step.status === "available") await db.from("path_steps").update({ status: "in_progress" }).eq("id", stepId);
}

/**
 * Resposta do aluno a uma questão do tutor:
 * - acertou: conta acerto seguido; com 2 seguidos a etapa é concluída e as próximas são liberadas;
 * - errou: o tutor diagnostica a dificuldade, explica de outro jeito (mais simples) e passa uma questão mais fácil.
 * A resposta também passa pelo registro normal (caderno de erros, revisão espaçada, domínio por tópico).
 */
export async function answerStep(db: DB, userId: string, stepId: string, input: { questionId: string; answer: string; confidence: string }) {
  const step = await loadStep(db, stepId);
  if (step.status === "done") throw new UserFacingError("Esta etapa já foi concluída.");

  // a questão precisa ser a última pergunta do tutor nesta etapa, ainda sem resposta
  const { data: last } = await db
    .from("tutor_messages")
    .select("kind, question_id")
    .eq("step_id", stepId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!last || last.kind !== "question" || last.question_id !== input.questionId) {
    throw new UserFacingError("Essa questão não está mais aberta.");
  }

  const { data: q } = await db.from("questions").select(`${QUESTION_FIELDS}, stem, options_json`).eq("id", input.questionId).single();
  if (!q) throw new UserFacingError("Questão não encontrada.");
  const { result, queuedJobs } = await recordAttempt(db, userId, q, {
    questionId: q.id,
    answer: input.answer,
    confidence: input.confidence,
  });

  await addMessage(db, userId, stepId, "student", "feedback", {
    answer: input.answer,
    correct: result.correct,
    right_answer: result.answer,
    explanation: result.explanation,
    chunk_id: result.chunk_id,
    page: result.source_page,
  });

  const outcome = applyAnswer(step.correct_streak, result.correct);
  const update: Database["public"]["Tables"]["path_steps"]["Update"] = {
    correct_streak: outcome.streak,
    attempts_count: step.attempts_count + 1,
  };

  if (outcome.passed) {
    update.status = "done";
    update.completed_at = new Date().toISOString();
    await db.from("path_steps").update(update).eq("id", stepId);
    await addMessage(db, userId, stepId, "tutor", "done", {
      text: `Muito bem! Você acertou ${outcome.streak} seguidas e mostrou que entendeu "${step.title}".`,
    });
    await unlockNext(db, step.path_id);
    return { result, queuedJobs, passed: true };
  }

  await db.from("path_steps").update(update).eq("id", stepId);
  const fresh = { ...step, correct_streak: outcome.streak };
  if (!result.correct) {
    const options = (q.options_json as string[]) ?? [];
    const chosen = options[letterToIndex(input.answer)] ?? input.answer;
    const right = options[letterToIndex(result.answer)] ?? result.answer;
    const { data: chunk } = q.chunk_id ? await db.from("chunks").select("content").eq("id", q.chunk_id).maybeSingle() : { data: null };
    const { data: diag } = await generateJSON(
      tutorDiagnosePrompt({ stem: q.stem, options, correct: right, chosen, explanation: q.explanation, source: chunk?.content ?? null }),
    );
    await addMessage(db, userId, stepId, "tutor", "diagnosis", { difficulty: diag.difficulty, text: diag.message });
    const chunks = await explain(db, userId, fresh, diag.difficulty);
    await askQuestion(db, userId, fresh, false, chunks);
  } else {
    await askQuestion(db, userId, fresh, true);
  }
  return { result, queuedJobs, passed: false };
}

/** Pede ao tutor para explicar de novo, mais simples, sem precisar errar. */
export async function explainAgain(db: DB, userId: string, stepId: string) {
  const step = await loadStep(db, stepId);
  await addMessage(db, userId, stepId, "student", "chat", { text: "Pode explicar de outro jeito?" });
  await explain(db, userId, step, "o aluno pediu uma explicação mais simples");
}

/** Dúvida livre do aluno dentro da etapa (responde com o material, citando a página). */
export async function askTutor(db: DB, userId: string, stepId: string, question: string) {
  const step = await loadStep(db, stepId);
  await addMessage(db, userId, stepId, "student", "chat", { text: question });
  const found = await searchChunks(db, step.learning_paths.subject_id, `${step.title}. ${question}`, 6);
  const { data } = await generateJSON(chatPrompt({ question, history: [], chunks: found }));
  const citations = [...new Set(data.sources)]
    .map((n) => ({ n, chunk: sourceAt(found, n) }))
    .filter((c) => c.chunk)
    .map((c) => ({ n: c.n, chunk_id: c.chunk!.id, page: c.chunk!.page }));
  await addMessage(db, userId, stepId, "tutor", "chat", { text: data.answer, citations, has_basis: data.has_basis });
}

async function unlockNext(db: DB, pathId: string) {
  const { data: steps } = await db.from("path_steps").select("id, position, prerequisites, status").eq("path_id", pathId);
  if (!steps) return;
  const before = new Map(steps.map((s) => [s.id, s.status]));
  const after = unlockSteps(steps.map((s) => ({ ...s, status: s.status as StepStatus })));
  const opened = after.filter((s) => before.get(s.id) !== s.status).map((s) => s.id);
  if (opened.length) await db.from("path_steps").update({ status: "available" }).in("id", opened);
}

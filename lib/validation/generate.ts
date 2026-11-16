import { z } from "zod";

import { DIFFICULTIES } from "@/lib/ai/prompts/questions";
import { SELECTABLE_STYLES } from "@/lib/exam-styles";
import { CONFIDENCE_LEVELS } from "@/lib/quiz/confidence";
import { MAX_FLASHCARDS_PER_REQUEST, MAX_QUESTIONS_PER_REQUEST } from "@/lib/limits";

const optionalUuid = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid().optional());

export const generateQuestionsSchema = z.object({
  subject_id: z.uuid(),
  material_id: optionalUuid,
  topic_id: optionalUuid,
  count: z.coerce.number().int().min(1).max(MAX_QUESTIONS_PER_REQUEST),
  difficulty: z.enum([...DIFFICULTIES, "misturada"]).default("misturada"),
  style: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(SELECTABLE_STYLES).optional()),
  mode: z.enum(["pratica", "simulado"]).default("pratica"),
});

export const generateFlashcardsSchema = z.object({
  subject_id: z.uuid(),
  material_id: optionalUuid,
  count: z.coerce.number().int().min(1).max(MAX_FLASHCARDS_PER_REQUEST),
});

export const generateSummarySchema = z.object({ material_id: z.uuid() });

export const attemptSchema = z.object({
  question_id: z.uuid(),
  quiz_id: optionalUuid,
  answer: z.enum(["A", "B", "C", "D", "E"]),
  confidence: z.enum(CONFIDENCE_LEVELS, "Marque sua confiança antes de responder"),
  time_ms: z.number().int().min(0).max(3_600_000).optional(),
});

export const chatRequestSchema = z.object({
  subject_id: z.uuid(),
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .default([]),
});

const answerLetter = z.enum(["A", "B", "C", "D", "E"]);

export const reviewSchema = z.object({
  flashcard_id: z.uuid(),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export const simuladoStartSchema = z.object({ quiz_id: z.uuid() });

export const simuladoFinishSchema = z.object({
  quiz_id: z.uuid(),
  answers: z
    .array(
      z.object({
        question_id: z.uuid(),
        answer: answerLetter.nullable(),
        confidence: z.enum(CONFIDENCE_LEVELS).nullable(),
        time_ms: z.number().int().min(0).max(6 * 3_600_000),
      }),
    )
    .max(200),
});

const isoDate = z.iso.date();

export const planActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setup"),
    subject_id: z.uuid(),
    exam_date: isoDate,
    hours_per_day: z.coerce.number().min(0.5).max(24),
  }),
  z.object({ action: z.literal("missed"), subject_id: z.uuid(), date: isoDate }),
  z.object({ action: z.literal("done"), subject_id: z.uuid(), date: isoDate }),
  z.object({ action: z.literal("task"), subject_id: z.uuid(), date: isoDate, task_id: z.string().min(1).max(100), done: z.boolean() }),
  z.object({ action: z.literal("refresh"), subject_id: z.uuid() }),
]);

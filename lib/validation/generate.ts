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
  style: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum([...SELECTABLE_STYLES, "professor"]).optional()),
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
  /** letra (A–E) nas objetivas; texto livre nas discursivas */
  answer: z.string().trim().min(1, "Escreva sua resposta").max(5000, "Resposta muito longa (máx. 5000 caracteres)"),
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

export const createPathSchema = z.object({
  subject_id: z.uuid(),
  goal: z.string().trim().min(3, "Descreva seu objetivo").max(300),
});

export const tutorActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), step_id: z.uuid() }),
  z.object({
    action: z.literal("answer"),
    step_id: z.uuid(),
    question_id: z.uuid(),
    answer: answerLetter,
    confidence: z.enum(CONFIDENCE_LEVELS, "Marque sua confiança antes de responder"),
  }),
  z.object({ action: z.literal("again"), step_id: z.uuid() }),
  z.object({ action: z.literal("ask"), step_id: z.uuid(), question: z.string().trim().min(2).max(1000) }),
]);

export const sessionSchema = z.object({
  focus_minutes: z.number().int().min(1).max(180),
  subject_id: optionalUuid,
  scene: z.enum(["quarto", "kyoto", "toquio", "cafe"]).optional(),
  goals: z.array(z.object({ title: z.string().trim().min(1).max(200), done: z.boolean() })).max(20).default([]),
});

export const MAX_FEYNMAN_AUDIO_BASE64 = 10_000_000; // ~3 min de WAV 16 kHz

export const feynmanSchema = z
  .object({
    topic_id: z.uuid(),
    text: z.string().trim().max(8000).optional(),
    audio_base64: z.string().max(MAX_FEYNMAN_AUDIO_BASE64, "Áudio muito longo (máx. 3 min)").optional(),
  })
  .refine((v) => (v.text && v.text.length >= 30) || v.audio_base64, { message: "Escreva pelo menos algumas frases ou grave um áudio" });

export const solvePhotoSchema = z.object({
  image_base64: z.string().min(100).max(8_000_000, "Imagem muito grande"),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  subject_id: optionalUuid,
});

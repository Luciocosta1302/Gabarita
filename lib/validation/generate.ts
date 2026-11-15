import { z } from "zod";

import { DIFFICULTIES } from "@/lib/ai/prompts/questions";
import { CONFIDENCE_LEVELS } from "@/lib/quiz/confidence";
import { MAX_FLASHCARDS_PER_REQUEST, MAX_QUESTIONS_PER_REQUEST } from "@/lib/limits";

const optionalUuid = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.uuid().optional());

export const generateQuestionsSchema = z.object({
  subject_id: z.uuid(),
  material_id: optionalUuid,
  count: z.coerce.number().int().min(1).max(MAX_QUESTIONS_PER_REQUEST),
  difficulty: z.enum([...DIFFICULTIES, "misturada"]).default("misturada"),
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

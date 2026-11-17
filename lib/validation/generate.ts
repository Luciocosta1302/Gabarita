import { z } from "zod";

import { avatarSchema, usernameSchema } from "@/lib/avatar/avatar";
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

export const chatClearSchema = z.object({ subject_id: z.uuid(), material_id: z.uuid().optional() });

export const chatRequestSchema = z.object({
  subject_id: z.uuid(),
  /** Biblioteca: conversar com um único documento */
  material_id: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
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
  z.object({ action: z.literal("continue"), step_id: z.uuid() }),
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

export const roomActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(1, "Dê um nome à sala").max(80), subject_id: optionalUuid }),
  z.object({ action: z.literal("join"), code: z.string().trim().min(4).max(40) }),
  z.object({ action: z.literal("share"), room_id: z.uuid(), material_id: z.uuid() }),
  z.object({ action: z.literal("import"), room_material_id: z.uuid(), subject_id: z.uuid() }),
  z.object({
    action: z.literal("quiz"),
    room_id: z.uuid(),
    subject_id: z.uuid(),
    count: z.coerce.number().int().min(3).max(30),
    style: z.string().max(20).optional(),
  }),
  z.object({
    action: z.literal("submit"),
    room_quiz_id: z.uuid(),
    answers: z.record(z.string(), z.enum(["A", "B", "C", "D", "E"]).nullable()),
    time_ms: z.number().int().min(0).max(6 * 3_600_000),
  }),
]);

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Escreva seu nome").max(80).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(160, "A bio tem no máximo 160 caracteres").optional(),
    avatar: avatarSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nada para salvar.");

export const MOODS = ["otimo", "bem", "ok", "cansado", "frustrado"] as const;

export const journalActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    learned: z.string().trim().min(3, "Conte o que você aprendeu").max(3000),
    difficulties: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(3000).optional()),
    mood: z.enum(MOODS),
    subject_id: optionalUuid,
    focus_minutes: z.coerce.number().int().min(0).max(1440).optional(),
  }),
  z.object({ action: z.literal("reflect") }),
]);

export const noteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), subject_id: optionalUuid, title: z.string().trim().min(1).max(200).default("Sem título") }),
  z.object({
    action: z.literal("update"),
    id: z.uuid(),
    title: z.string().trim().min(1, "Dê um título").max(200).optional(),
    content: z.string().max(100000, "Anotação muito longa").optional(),
    subject_id: z.uuid().nullable().optional(),
  }),
  z.object({ action: z.literal("delete"), id: z.uuid() }),
]);

export const COMMUNITY_CATEGORIES = ["duvida", "dica", "material", "grupo"] as const;
export const REPORT_REASONS = ["ofensivo", "spam", "golpe", "dados_pessoais", "outro"] as const;

export const communityActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("post"),
    category: z.enum(COMMUNITY_CATEGORIES),
    title: z.string().trim().min(3, "Título muito curto").max(160),
    body: z.string().trim().min(1, "Escreva alguma coisa").max(5000),
  }),
  z.object({ action: z.literal("comment"), post_id: z.uuid(), body: z.string().trim().min(1, "Escreva alguma coisa").max(3000) }),
  z.object({ action: z.literal("like"), post_id: z.uuid(), like: z.boolean() }),
  z.object({ action: z.literal("delete_post"), id: z.uuid() }),
  z.object({ action: z.literal("delete_comment"), id: z.uuid() }),
  z.object({ action: z.literal("report"), target: z.enum(["post", "comment"]), id: z.uuid(), reason: z.enum(REPORT_REASONS) }),
]);

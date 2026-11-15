/**
 * Schemas Zod das respostas da IA. Cada prompt em lib/ai/prompts/ define o seu junto do prompt;
 * aqui ficam reexportados num lugar só.
 */
export { chatSchema, type ChatAnswer } from "./prompts/chat";
export { errorFollowupSchema, type ErrorFollowup } from "./prompts/error-followup";
export { flashcardsSchema, type GeneratedFlashcards } from "./prompts/flashcards";
export { ocrImageSchema, ocrPdfSchema } from "./prompts/ocr";
export { questionsSchema, type GeneratedQuestions } from "./prompts/questions";
export { summarySchema, type Summary } from "./prompts/summary";

/** Limites do produto (CLAUDE.md §7). Sem dependências: usados no navegador e no servidor. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB por arquivo
export const MAX_IMAGES_PER_MATERIAL = 30;
export const MAX_PASTED_TEXT_CHARS = 300_000;

export type Plan = "free" | "pro";

/** Páginas por material. O OCR de PDF da IA aceita até 100 páginas por documento. */
export function maxPagesFor(plan: Plan) {
  return plan === "pro" ? 300 : 100;
}

export const MAX_QUESTIONS_PER_REQUEST = 30;
export const MAX_FLASHCARDS_PER_REQUEST = 40;

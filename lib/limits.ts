/** Limites do produto (CLAUDE.md §7). Sem dependências: usados no navegador e no servidor. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB por arquivo
export const MAX_IMAGES_PER_MATERIAL = 30;
export const MAX_PASTED_TEXT_CHARS = 300_000;

/** Páginas por material (o OCR de PDF da IA aceita até 100 páginas por documento). */
export const MAX_PAGES = 100;

export const MAX_QUESTIONS_PER_REQUEST = 30;
export const MAX_FLASHCARDS_PER_REQUEST = 40;

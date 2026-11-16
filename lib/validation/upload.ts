import { z } from "zod";

import { MAX_IMAGES_PER_MATERIAL, MAX_PASTED_TEXT_CHARS, MAX_UPLOAD_BYTES } from "@/lib/limits";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const AUDIO_EXTS = ["mp3", "wav", "m4a", "ogg", "webm", "aac"] as const;
/** Valor do atributo `accept` do input de arquivo. */
export const ACCEPT = ["application/pdf", ".pdf", DOCX_MIME, ".docx", ...IMAGE_MIMES, "audio/*", ...AUDIO_EXTS.map((e) => `.${e}`)].join(",");

const fileMeta = z.object({
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "Arquivo maior que 20 MB"),
  type: z.string().max(200),
});

export const createUploadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("files"),
    subject_id: z.uuid(),
    /** "past_exam" = prova antiga (D4): vira perfil do professor, não trecho de estudo */
    purpose: z.enum(["study", "past_exam"]).default("study"),
    title: z.string().trim().max(200).optional(),
    files: z.array(fileMeta).min(1).max(MAX_IMAGES_PER_MATERIAL, `No máximo ${MAX_IMAGES_PER_MATERIAL} fotos por vez`),
  }),
  z.object({
    kind: z.literal("text"),
    subject_id: z.uuid(),
    purpose: z.enum(["study", "past_exam"]).default("study"),
    title: z.string().trim().min(1, "Dê um título").max(200),
    text: z.string().trim().min(50, "Cole pelo menos algumas frases").max(MAX_PASTED_TEXT_CHARS, "Texto muito longo"),
  }),
  /** Página da web, PDF por link ou vídeo do YouTube */
  z.object({
    kind: z.literal("link"),
    subject_id: z.uuid(),
    url: z
      .string()
      .trim()
      .max(2000, "Link muito longo")
      .transform((u) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`))
      .pipe(z.url({ protocol: /^https?$/, error: "Cole um link válido (http ou https)" })),
    title: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(200).optional()),
  }),
]);

type FileMeta = z.infer<typeof fileMeta>;

function ext(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

export function isPdf(f: FileMeta) {
  return f.type === "application/pdf" || ext(f.name) === "pdf";
}
export function isDocx(f: FileMeta) {
  return f.type === DOCX_MIME || ext(f.name) === "docx";
}
export function isAudio(f: FileMeta) {
  return f.type.startsWith("audio/") || (AUDIO_EXTS as readonly string[]).includes(ext(f.name));
}
export function isImage(f: FileMeta) {
  return f.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext(f.name));
}

/** Decide o tipo do material: 1 PDF, 1 DOCX, ou várias fotos. Devolve mensagem de erro se a combinação não vale. */
export function materialTypeFor(files: FileMeta[]): { type: "pdf" | "docx" | "image" | "audio" } | { error: string } {
  if (files.every(isImage)) return { type: "image" };
  if (files.length === 1 && isAudio(files[0])) return { type: "audio" };
  if (files.length === 1 && isPdf(files[0])) return { type: "pdf" };
  if (files.length === 1 && isDocx(files[0])) return { type: "docx" };
  if (files.length > 1) return { error: "Envie um PDF, DOCX ou áudio por vez (várias de uma vez só para fotos)." };
  return { error: "Formato não suportado. Use PDF, DOCX, fotos (JPG, PNG, WEBP) ou áudio (MP3, WAV, M4A)." };
}

/** Caminho no Storage: <user_id>/<material_id>/001.pdf — nomes do servidor, nunca do usuário. */
export function storagePathFor(userId: string, materialId: string, index: number, file: FileMeta) {
  const e = isPdf(file) ? "pdf" : isDocx(file) ? "docx" : ext(file.name) || (isAudio(file) ? "mp3" : "jpg");
  return `${userId}/${materialId}/${String(index + 1).padStart(3, "0")}.${e}`;
}

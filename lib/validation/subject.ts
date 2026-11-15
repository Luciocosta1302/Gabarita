import { z } from "zod";

import { EXAM_STYLES } from "@/lib/exam-styles";

export { EXAM_STYLE_LABELS, EXAM_STYLES } from "@/lib/exam-styles";

/** Campo vazio de formulário vira undefined. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da matéria").max(120, "Nome muito longo"),
  exam_date: z.preprocess(emptyToUndefined, z.iso.date("Data inválida").optional()),
  hours_per_day: z.preprocess(
    emptyToUndefined,
    z.coerce.number("Horas inválidas").min(0.5, "Mínimo 0,5 h").max(24, "Máximo 24 h").optional(),
  ),
  exam_style: z.enum(EXAM_STYLES).default("livre"),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

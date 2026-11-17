import { z } from "zod";

import { NEWS_SOURCES, STATES, STUDY_GOALS } from "./catalog";

const url = z
  .string()
  .trim()
  .max(500)
  .transform((u) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`))
  .pipe(z.url({ protocol: /^https?$/, error: "Link de feed inválido (use http ou https)" }));

export const studyGoalSchema = z.enum(STUDY_GOALS.map((g) => g.id) as [string, ...string[]]);

export const newsPrefsSchema = z.object({
  goal: studyGoalSchema.optional(),
  sources: z.array(z.enum(NEWS_SOURCES.map((s) => s.id) as [string, ...string[]])).max(30),
  custom_feeds: z.array(url).max(5, "No máximo 5 links próprios"),
  state: z.preprocess((v) => (v === "" ? null : v), z.enum(STATES.map(([uf]) => uf) as [string, ...string[]]).nullable()),
  city: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(60).nullable()),
});

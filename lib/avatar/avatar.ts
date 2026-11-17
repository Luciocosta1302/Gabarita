import { z } from "zod";

/**
 * Avatar do aluno: um personagem da turma, com cor, item de cabeça, item de pescoço e fundo.
 * Algumas roupas são liberadas pelo nível (XP), como recompensa. Regras puras (testadas).
 */

export type Who = "mochi" | "daru" | "fuku";

export const COLORS = {
  mochi: [
    { id: "tricolor", label: "Tricolor", level: 1, fur: "#fbf4e8", p1: "#e39a4f", p2: "#3a2f2a" },
    { id: "laranja", label: "Laranja", level: 1, fur: "#f6cf9c", p1: "#e08a3c", p2: "#c96f2a" },
    { id: "cinza", label: "Cinza", level: 1, fur: "#d9d5ce", p1: "#9d978e", p2: "#6f6a63" },
    { id: "siames", label: "Siamês", level: 2, fur: "#f6ead6", p1: "#8a6a55", p2: "#5a4335" },
    { id: "branca", label: "Branca", level: 1, fur: "#fffaf2", p1: "#fffaf2", p2: "#efe6d8" },
    { id: "sakura", label: "Sakura", level: 4, fur: "#fbe9ec", p1: "#f2b8c0", p2: "#e48c9a" },
  ],
  daru: [
    { id: "vermelho", label: "Vermelho", level: 1, light: "#e0503f", mid: "#c8372d", dark: "#a52a22", text: "#f3d27a" },
    { id: "indigo", label: "Índigo", level: 1, light: "#3e5679", mid: "#22334b", dark: "#16233a", text: "#f3d27a" },
    { id: "matcha", label: "Matchá", level: 1, light: "#7aa654", mid: "#5d8a3a", dark: "#456b29", text: "#fbf4e8" },
    { id: "branco", label: "Branco", level: 2, light: "#ffffff", mid: "#efe7da", dark: "#d6cab6", text: "#c8372d" },
    { id: "preto", label: "Preto", level: 3, light: "#4a403b", mid: "#2b2522", dark: "#181412", text: "#f3d27a" },
    { id: "dourado", label: "Dourado", level: 5, light: "#f0cf72", mid: "#c79a3a", dark: "#9c7524", text: "#7a1f18" },
  ],
  fuku: [
    { id: "marrom", label: "Marrom", level: 1, feather: "#7a5a43", dark: "#5b4232", belly: "#f1e2c8" },
    { id: "neve", label: "Neve", level: 1, feather: "#e4dfd6", dark: "#bdb5a8", belly: "#fffaf2" },
    { id: "azul", label: "Azulada", level: 1, feather: "#6f7d90", dark: "#4f5a6a", belly: "#e8ebf0" },
    { id: "ruiva", label: "Ruiva", level: 2, feather: "#b36a3c", dark: "#8a4d28", belly: "#f6e1c6" },
    { id: "indigo", label: "Índigo", level: 4, feather: "#2f4466", dark: "#1d2c45", belly: "#dfe6f2" },
  ],
} as const;

export const HEAD_ITEMS = [
  { id: "nada", label: "Nada", level: 1 },
  { id: "hachimaki", label: "Hachimaki 必勝", level: 1, hint: "faixa de “vitória certa” que estudantes usam antes da prova" },
  { id: "flor", label: "Flor de sakura", level: 1 },
  { id: "laco", label: "Laço", level: 2 },
  { id: "fones", label: "Fones lo-fi", level: 3 },
  { id: "kasa", label: "Chapéu kasa", level: 4 },
  { id: "capelo", label: "Capelo de formatura", level: 6 },
] as const;

export const NECK_ITEMS = [
  { id: "nada", label: "Nada", level: 1 },
  { id: "cachecol", label: "Cachecol", level: 2 },
  { id: "gravata", label: "Gravata-borboleta", level: 3 },
  { id: "medalha", label: "Medalha 合格", level: 5 },
] as const;

export const BACKGROUNDS = [
  { id: "washi", label: "Papel", level: 1, color: "#f4efe4" },
  { id: "sakura", label: "Sakura", level: 1, color: "#f6d6db" },
  { id: "matcha", label: "Matchá", level: 1, color: "#cfe0bf" },
  { id: "ai", label: "Índigo", level: 2, color: "#22334b" },
  { id: "kin", label: "Dourado", level: 3, color: "#ecd28f" },
  { id: "shu", label: "Vermelho", level: 4, color: "#c8372d" },
] as const;

const colorIds = (w: Who) => COLORS[w].map((c) => c.id) as [string, ...string[]];

export const avatarSchema = z
  .object({
    who: z.enum(["mochi", "daru", "fuku"]),
    color: z.string().max(20),
    head: z.enum(HEAD_ITEMS.map((h) => h.id) as [string, ...string[]]),
    neck: z.enum(NECK_ITEMS.map((n) => n.id) as [string, ...string[]]),
    bg: z.enum(BACKGROUNDS.map((b) => b.id) as [string, ...string[]]),
  })
  .refine((a) => colorIds(a.who).includes(a.color), { message: "Cor não existe para este personagem", path: ["color"] });

export type Avatar = z.infer<typeof avatarSchema>;

export const DEFAULT_AVATAR: Avatar = { who: "mochi", color: "tricolor", head: "nada", neck: "nada", bg: "washi" };

/** Lê o avatar guardado (pode vir de qualquer lugar): inválido → padrão. */
export function parseAvatar(json: unknown): Avatar {
  const r = avatarSchema.safeParse(json);
  return r.success ? r.data : DEFAULT_AVATAR;
}

/** Itens que o nível ainda não libera (vazio = pode usar). */
export function lockedParts(a: Avatar, level: number) {
  const out: string[] = [];
  const color = COLORS[a.who].find((c) => c.id === a.color);
  if (color && color.level > level) out.push(`cor ${color.label} (nível ${color.level})`);
  const head = HEAD_ITEMS.find((h) => h.id === a.head);
  if (head && head.level > level) out.push(`${head.label} (nível ${head.level})`);
  const neck = NECK_ITEMS.find((n) => n.id === a.neck);
  if (neck && neck.level > level) out.push(`${neck.label} (nível ${neck.level})`);
  const bg = BACKGROUNDS.find((b) => b.id === a.bg);
  if (bg && bg.level > level) out.push(`fundo ${bg.label} (nível ${bg.level})`);
  return out;
}

export function colorOf(a: Avatar) {
  return COLORS[a.who].find((c) => c.id === a.color) ?? COLORS[a.who][0];
}

export function bgOf(a: Avatar) {
  return (BACKGROUNDS.find((b) => b.id === a.bg) ?? BACKGROUNDS[0]).color;
}

/** @usuário: 3 a 20 letras minúsculas, números ou _. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use de 3 a 20 letras sem acento, números ou _ (sem espaço).");

/** Sugestão de @ a partir do nome: "Lúcia Costa" → "lucia_costa". */
export function suggestUsername(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return base.length >= 3 ? base : `aluno_${base}`.slice(0, 16);
}

/** Cenários do Espaço de estudos — regras puras (horário do dia, desbloqueio, sequência de dias). */
import { addDays } from "@/lib/dates";

export type TimeOfDay = "madrugada" | "amanhecer" | "dia" | "entardecer" | "noite";

export function timeOfDay(hour: number): TimeOfDay {
  if (hour < 5) return "madrugada";
  if (hour < 8) return "amanhecer";
  if (hour < 17) return "dia";
  if (hour < 19) return "entardecer";
  return "noite";
}

export const TIME_LABELS: Record<TimeOfDay, string> = {
  madrugada: "Madrugada silenciosa",
  amanhecer: "Amanhecer",
  dia: "Tarde tranquila",
  entardecer: "Pôr do sol",
  noite: "Noite estrelada",
};

export const SCENES = [
  { id: "quarto", name: "Quarto aconchegante", unlockMinutes: 0 },
  { id: "kyoto", name: "Biblioteca em Kyoto", unlockMinutes: 100 },
  { id: "toquio", name: "Quarto chuvoso em Tóquio", unlockMinutes: 300 },
  { id: "cafe", name: "Cafeteria à noite", unlockMinutes: 600 },
] as const;
export type SceneId = (typeof SCENES)[number]["id"];
export const SCENE_IDS = SCENES.map((s) => s.id) as [SceneId, ...SceneId[]];

export function isUnlocked(scene: SceneId, totalMinutes: number) {
  return totalMinutes >= SCENES.find((s) => s.id === scene)!.unlockMinutes;
}

export function nextUnlock(totalMinutes: number) {
  const next = SCENES.find((s) => s.unlockMinutes > totalMinutes);
  return next ? { scene: next, minutesLeft: next.unlockMinutes - totalMinutes } : null;
}

/** Cenários que passaram a ficar liberados com os minutos novos (para comemorar). */
export function newlyUnlocked(before: number, after: number) {
  return SCENES.filter((s) => s.unlockMinutes > before && s.unlockMinutes <= after);
}

/** Dias seguidos com estudo, terminando hoje (ou ontem, se hoje ainda não estudou). */
export function streakDays(studyDates: string[], today: string) {
  const days = new Set(studyDates);
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

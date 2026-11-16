/** Pomodoro — regras puras. */

export type Phase = "focus" | "short_break" | "long_break";

export type PomodoroPreset = { id: string; label: string; focus: number; shortBreak: number; longBreak: number; longEvery: number };

export const PRESETS: PomodoroPreset[] = [
  { id: "classico", label: "Clássico 25/5", focus: 25, shortBreak: 5, longBreak: 15, longEvery: 4 },
  { id: "longo", label: "Foco longo 50/10", focus: 50, shortBreak: 10, longBreak: 20, longEvery: 3 },
  { id: "curto", label: "Aquecimento 15/3", focus: 15, shortBreak: 3, longBreak: 10, longEvery: 4 },
];

export const PHASE_LABELS: Record<Phase, string> = { focus: "Foco", short_break: "Pausa", long_break: "Pausa longa" };

export function phaseMinutes(preset: PomodoroPreset, phase: Phase) {
  return phase === "focus" ? preset.focus : phase === "short_break" ? preset.shortBreak : preset.longBreak;
}

/** Depois de terminar uma fase: foco → pausa (longa a cada N focos); pausa → foco. */
export function nextPhase(preset: PomodoroPreset, phase: Phase, completedFocus: number): Phase {
  if (phase !== "focus") return "focus";
  return completedFocus > 0 && completedFocus % preset.longEvery === 0 ? "long_break" : "short_break";
}

export function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

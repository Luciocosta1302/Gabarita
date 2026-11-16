import { describe, expect, it } from "vitest";

import { formatClock, nextPhase, PRESETS } from "@/lib/focus/pomodoro";
import { isUnlocked, newlyUnlocked, nextUnlock, streakDays, timeOfDay } from "@/lib/focus/scenes";

const classic = PRESETS[0];

describe("Pomodoro", () => {
  it("foco → pausa curta; a cada 4 focos, pausa longa; pausa → foco", () => {
    expect(nextPhase(classic, "focus", 1)).toBe("short_break");
    expect(nextPhase(classic, "focus", 4)).toBe("long_break");
    expect(nextPhase(classic, "short_break", 1)).toBe("focus");
    expect(nextPhase(classic, "long_break", 4)).toBe("focus");
  });
  it("relógio mm:ss", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(61_001)).toBe("01:02");
    expect(formatClock(-5)).toBe("00:00");
  });
});

describe("cenários", () => {
  it("cenário muda com o horário", () => {
    expect([3, 6, 12, 18, 22].map(timeOfDay)).toEqual(["madrugada", "amanhecer", "dia", "entardecer", "noite"]);
  });
  it("desbloqueio por minutos de foco", () => {
    expect(isUnlocked("quarto", 0)).toBe(true);
    expect(isUnlocked("kyoto", 99)).toBe(false);
    expect(isUnlocked("kyoto", 100)).toBe(true);
    expect(nextUnlock(120)).toMatchObject({ scene: { id: "toquio" }, minutesLeft: 180 });
    expect(nextUnlock(9999)).toBeNull();
    expect(newlyUnlocked(90, 310).map((s) => s.id)).toEqual(["kyoto", "toquio"]);
  });
  it("sequência de dias seguidos", () => {
    const today = "2026-11-16";
    expect(streakDays(["2026-11-16", "2026-11-15", "2026-11-14", "2026-11-12"], today)).toBe(3);
    expect(streakDays(["2026-11-15", "2026-11-14"], today)).toBe(2); // hoje ainda não estudou
    expect(streakDays(["2026-11-13"], today)).toBe(0);
  });
});

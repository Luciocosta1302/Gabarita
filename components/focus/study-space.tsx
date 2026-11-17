"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJSON, selectClass } from "@/lib/api/client";
import { Ambience } from "@/lib/focus/audio";
import {
  customPreset,
  formatClock,
  nextPhase,
  PHASE_LABELS,
  phaseMinutes,
  type PomodoroPreset,
  PRESETS,
  stepCustom,
  type Phase,
} from "@/lib/focus/pomodoro";
import {
  isUnlocked,
  newlyUnlocked,
  nextUnlock,
  SCENES,
  TIME_LABELS,
  timeOfDay,
  type SceneId,
  type TimeOfDay,
} from "@/lib/focus/scenes";
import { cn } from "@/lib/utils";

import { PomodoroDial, PomodoroSettings } from "./pomodoro-dial";
import { Scene } from "./scene";

type Goal = { id: string; title: string; done: boolean };
type Stats = {
  totalMinutes: number;
  todayMinutes: number;
  sessionsToday: number;
  streak: number;
};

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}

export function StudySpace({
  initialStats,
  planTasks,
  subjects,
  today,
  initialTod,
}: {
  initialStats: Stats;
  planTasks: { title: string; subject: string }[];
  subjects: { id: string; name: string }[];
  today: string;
  initialTod: TimeOfDay;
}) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [tod, setTod] = useState<TimeOfDay>(initialTod);
  const [scene, setScene] = useState<SceneId>("quarto");
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [custom, setCustom] = useState<PomodoroPreset>(() => customPreset(null));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const preset = presetId === "personalizado" ? custom : PRESETS.find((p) => p.id === presetId)!;
  const [phase, setPhase] = useState<Phase>("focus");
  const [completedFocus, setCompletedFocus] = useState(0);
  const [remaining, setRemaining] = useState(preset.focus * 60_000);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [music, setMusic] = useState(0);
  const [rain, setRain] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const audio = useRef<Ambience | null>(null);
  const goalsKey = `espaco:metas:${today}`;

  // preferências guardadas neste navegador
  useEffect(() => {
    setGoals(load<Goal[]>(goalsKey, []));
    const s = load<SceneId>("espaco:cenario", "quarto");
    setScene(isUnlocked(s, initialStats.totalMinutes) ? s : "quarto");
    setTod(timeOfDay(new Date().getHours()));
    const t = setInterval(
      () => setTod(timeOfDay(new Date().getHours())),
      60_000,
    );
    return () => clearInterval(t);
  }, [goalsKey, initialStats.totalMinutes]);
  useEffect(() => save(goalsKey, goals), [goals, goalsKey]);
  // Pomodoro escolhido e o personalizado ficam guardados neste navegador
  useEffect(() => {
    const c = customPreset(load<Record<string, unknown> | null>("espaco:pomodoro:personalizado", null));
    const id = load<string>("espaco:pomodoro", PRESETS[0].id);
    setCustom(c);
    if (id === "personalizado" || PRESETS.some((p) => p.id === id)) {
      setPresetId(id);
      setRemaining((id === "personalizado" ? c : PRESETS.find((p) => p.id === id)!).focus * 60_000);
    }
  }, []);
  useEffect(() => save("espaco:cenario", scene), [scene]);
  useEffect(() => () => audio.current?.stop(), []);

  const sound = () => (audio.current ??= new Ambience());

  const finishPhase = useCallback(async () => {
    sound().chime();
    setEndsAt(null);
    if (phase === "focus") {
      const done = completedFocus + 1;
      setCompletedFocus(done);
      try {
        const r = await postJSON<Stats & { before: number }>("/api/sessions", {
          focus_minutes: preset.focus,
          subject_id: subjectId || undefined,
          scene,
          goals: goals.map(({ title, done: d }) => ({ title, done: d })),
        });
        setStats(r);
        const unlocked = newlyUnlocked(r.before, r.totalMinutes);
        setToast(
          unlocked.length
            ? `Novo cenário desbloqueado: ${unlocked.map((u) => u.name).join(", ")} ✨`
            : `+${preset.focus} min de foco! Hora de uma pausa 🍵`,
        );
        router.refresh();
      } catch {
        setToast("Não foi possível salvar a sessão (sem conexão?).");
      }
      const next = nextPhase(preset, "focus", done);
      setPhase(next);
      setRemaining(phaseMinutes(preset, next) * 60_000);
    } else {
      setPhase("focus");
      setRemaining(preset.focus * 60_000);
      setToast("Pausa terminada. Bora focar 📚");
    }
  }, [completedFocus, goals, phase, preset, router, scene, subjectId]);

  // relógio
  useEffect(() => {
    if (endsAt == null) return;
    const t = setInterval(() => {
      const left = endsAt - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        void finishPhase();
      }
    }, 250);
    return () => clearInterval(t);
  }, [endsAt, finishPhase]);

  useEffect(() => {
    document.title =
      endsAt != null
        ? `${formatClock(remaining)} · ${PHASE_LABELS[phase]} — Gabarita`
        : "Espaço de estudos — Gabarita";
  }, [remaining, phase, endsAt]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const running = endsAt != null;
  const total = phaseMinutes(preset, phase) * 60_000;
  const next = nextUnlock(stats.totalMinutes);
  const raining = rain > 0 || scene === "toquio";

  function addGoal(title: string) {
    const t = title.trim();
    if (!t || goals.length >= 20 || goals.some((g) => g.title === t)) return;
    setGoals([...goals, { id: crypto.randomUUID(), title: t, done: false }]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="grid content-start gap-4">
        <div
          className="relative aspect-video overflow-hidden rounded-3xl shadow-sm"
          data-testid="study-scene"
          data-scene={scene}
          data-tod={tod}
        >
          <Scene scene={scene} tod={tod} raining={raining} />
          <span className="absolute top-3 left-3 rounded-full bg-black/35 px-3 py-1 text-xs text-white">
            {SCENES.find((s) => s.id === scene)!.name} · {TIME_LABELS[tod]}
          </span>
        </div>

        <div className="bg-sidebar relative overflow-hidden rounded-3xl border-2 border-ink p-5 shadow-[0_4px_0_var(--ink)] sm:p-6" data-testid="pomodoro">
          <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#c8372d]/25 blur-3xl" aria-hidden />
          <div className="relative">
            {settingsOpen ? (
              <PomodoroSettings
                presetId={presetId}
                custom={custom}
                onPick={(id) => {
                  const p = id === "personalizado" ? custom : PRESETS.find((x) => x.id === id)!;
                  setPresetId(id);
                  save("espaco:pomodoro", id);
                  setPhase("focus");
                  setRemaining(p.focus * 60_000);
                }}
                onStep={(f, dir) => {
                  const c = stepCustom(custom, f, dir);
                  setCustom(c);
                  save("espaco:pomodoro:personalizado", { focus: c.focus, shortBreak: c.shortBreak, longBreak: c.longBreak, longEvery: c.longEvery });
                  if (phase === "focus") setRemaining(c.focus * 60_000);
                  else setRemaining(phaseMinutes(c, phase) * 60_000);
                }}
                onClose={() => setSettingsOpen(false)}
              />
            ) : (
              <PomodoroDial
                phase={phase}
                remaining={remaining}
                total={total}
                running={running}
                cycleDone={phase === "long_break" ? preset.longEvery : completedFocus % preset.longEvery}
                longEvery={preset.longEvery}
                focusToday={completedFocus}
                onStart={() => {
                  sound(); // libera o áudio no clique
                  setEndsAt(Date.now() + Math.max(1000, remaining));
                }}
                onPause={() => setEndsAt(null)}
                onReset={() => {
                  setEndsAt(null);
                  setRemaining(total);
                }}
                onSkipBreak={() => {
                  setEndsAt(null);
                  setPhase("focus");
                  setRemaining(preset.focus * 60_000);
                }}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}
          </div>
        </div>

        {toast && (
          <p
            role="status"
            className="bg-pastel-mint animate-rise rounded-2xl px-4 py-3 text-sm"
            data-testid="space-toast"
          >
            {toast}
          </p>
        )}
        {completedFocus > 0 && stats.todayMinutes > 0 && (
          <a href={`/diario?foco=${stats.todayMinutes}`} className="text-primary text-sm underline" data-testid="space-journal">
            📓 Registrar no diário o que você aprendeu hoje
          </a>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Foco hoje" value={`${stats.todayMinutes} min`} />
          <Stat
            label="Sequência"
            value={`${stats.streak} ${stats.streak === 1 ? "dia" : "dias"} 🔥`}
            testId="space-streak"
          />
          <Stat
            label="Total de foco"
            value={`${stats.totalMinutes} min`}
            testId="space-total"
          />
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <Panel title="Metas desta sessão">
          <ul className="grid gap-1.5" data-testid="session-goals">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  aria-label={g.title}
                  checked={g.done}
                  onChange={(e) =>
                    setGoals(
                      goals.map((x) =>
                        x.id === g.id ? { ...x, done: e.target.checked } : x,
                      ),
                    )
                  }
                />
                <span
                  className={cn(
                    "flex-1",
                    g.done && "text-muted-foreground line-through",
                  )}
                >
                  {g.title}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground text-xs"
                  aria-label={`Remover ${g.title}`}
                  onClick={() => setGoals(goals.filter((x) => x.id !== g.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addGoal(newGoal);
              setNewGoal("");
            }}
          >
            <Input
              aria-label="Nova meta"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Ex.: ler o capítulo 3"
              maxLength={200}
            />
            <Button type="submit" size="sm" variant="outline">
              +
            </Button>
          </form>
          {planTasks.length > 0 && (
            <div className="grid gap-1">
              <span className="text-muted-foreground text-xs">
                Do seu plano de hoje:
              </span>
              {planTasks.slice(0, 6).map((t) => (
                <button
                  key={`${t.subject}-${t.title}`}
                  type="button"
                  className="hover:bg-accent rounded-lg px-2 py-1 text-left text-xs"
                  onClick={() => addGoal(t.title)}
                >
                  + {t.title}{" "}
                  <span className="text-muted-foreground">· {t.subject}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Sons">
          <Slider
            label="Música lo-fi"
            value={music}
            onChange={(v) => {
              setMusic(v);
              sound().setMusic(v / 100);
            }}
          />
          <Slider
            label="Chuva"
            value={rain}
            onChange={(v) => {
              setRain(v);
              sound().setRain(v / 100);
            }}
          />
          <p className="text-muted-foreground text-xs">
            Sons gerados no seu navegador, sem anúncios.
          </p>
        </Panel>

        <Panel title="Sessão">
          {subjects.length > 0 && (
            <select
              aria-label="Matéria da sessão"
              className={selectClass}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Sem matéria específica</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Panel>

        <Panel title="Cenários">
          <div className="grid gap-2" data-testid="scene-picker">
            {SCENES.map((s) => {
              const open = isUnlocked(s.id, stats.totalMinutes);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!open}
                  onClick={() => setScene(s.id)}
                  aria-pressed={scene === s.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm",
                    scene === s.id ? "border-primary bg-accent" : "bg-card",
                    !open && "opacity-60",
                  )}
                >
                  <span>{s.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {open
                      ? scene === s.id
                        ? "em uso"
                        : ""
                      : `🔒 ${s.unlockMinutes} min`}
                  </span>
                </button>
              );
            })}
          </div>
          {next && (
            <p
              className="text-muted-foreground text-xs"
              data-testid="next-unlock"
            >
              Faltam {next.minutesLeft} min de foco para liberar{" "}
              {next.scene.name}.
            </p>
          )}
        </Panel>
      </aside>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card grid gap-3 rounded-2xl border p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border p-3 shadow-sm sm:p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-display text-lg font-bold sm:text-2xl" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex justify-between">
        {label}{" "}
        <span className="text-muted-foreground text-xs">
          {value ? `${value}%` : "desligado"}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </label>
  );
}

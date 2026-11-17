"use client";

import { Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, X } from "lucide-react";
import { useId } from "react";

import { CUSTOM_LIMITS, type CustomField, formatClock, type Phase, PHASE_LABELS, type PomodoroPreset, PRESETS } from "@/lib/focus/pomodoro";
import { cn } from "@/lib/utils";

const SIZE = 260;
const R = 112;
const C = 2 * Math.PI * R;
const TICKS = 60;

/** Cores do anel: foco em rosé → laranja; pausas em verde-água. */
const RING = {
  focus: ["#d9473a", "#e3a64a"],
  break: ["#6f9a48", "#b8cf86"],
} as const;

/** Mostrador circular do Pomodoro: anel de progresso, marcações, tempo e bolinhas do ciclo. */
export function PomodoroDial({
  phase,
  remaining,
  total,
  running,
  cycleDone,
  longEvery,
  focusToday,
  onStart,
  onPause,
  onReset,
  onSkipBreak,
  onOpenSettings,
}: {
  phase: Phase;
  remaining: number;
  total: number;
  running: boolean;
  /** focos concluídos no ciclo atual (até a pausa longa) */
  cycleDone: number;
  longEvery: number;
  focusToday: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkipBreak: () => void;
  onOpenSettings: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const colors = phase === "focus" ? RING.focus : RING.break;
  const started = remaining < total;

  return (
    <div className="grid justify-items-center gap-5">
      <div className="relative" style={{ width: "min(100%, 260px)", aspectRatio: "1" }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
            <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* trilho */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
          {/* marcações: as que já passaram ficam acesas */}
          {Array.from({ length: TICKS }, (_, i) => {
            const a = (i / TICKS) * 2 * Math.PI;
            const long = i % 5 === 0;
            const r1 = R - 18;
            const r2 = R - (long ? 28 : 23);
            const lit = i / TICKS < progress;
            return (
              <line
                key={i}
                x1={SIZE / 2 + r1 * Math.cos(a)}
                y1={SIZE / 2 + r1 * Math.sin(a)}
                x2={SIZE / 2 + r2 * Math.cos(a)}
                y2={SIZE / 2 + r2 * Math.sin(a)}
                stroke={lit ? colors[1] : "rgb(255 255 255 / 0.22)"}
                strokeWidth={long ? 2 : 1.2}
                strokeLinecap="round"
              />
            );
          })}
          {/* progresso */}
          {progress > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={`url(#ring-${uid})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              filter={`url(#glow-${uid})`}
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-1 text-center">
          <span className="text-xs tracking-[0.2em] text-white/60 uppercase" data-testid="pomodoro-phase">
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-5xl font-bold tracking-tight text-white tabular-nums sm:text-6xl" data-testid="pomodoro-clock" aria-live="off">
            {formatClock(remaining)}
          </span>
          <span className="flex gap-1.5" aria-label={`${cycleDone} de ${longEvery} focos até a pausa longa`} role="img">
            {Array.from({ length: longEvery }, (_, i) => (
              <span key={i} className={cn("size-2 rotate-45 rounded-[2px]", i < cycleDone ? "bg-[#e3a64a]" : "bg-white/20")} />
            ))}
          </span>
          <span className="mt-1 text-[11px] text-white/50">
            {focusToday} {focusToday === 1 ? "foco" : "focos"} hoje aqui
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <RoundButton label="Reiniciar" onClick={onReset} disabled={!started && !running}>
          <RotateCcw className="size-4" />
        </RoundButton>
        {running ? (
          <button type="button" onClick={onPause} className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full bg-white/10 px-6 text-sm font-semibold tracking-wider text-white uppercase ring-1 ring-white/20 transition hover:bg-white/15">
            <Pause aria-hidden className="size-4" /> Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-full border-2 border-black/60 px-6 text-sm font-bold tracking-wider text-[#fff8ef] uppercase shadow-[0_4px_0_rgb(0_0_0/0.55)] transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-[0_1px_0_rgb(0_0_0/0.55)]"
            style={{ backgroundColor: colors[0] }}
          >
            <Play aria-hidden className="size-4" /> {started ? "Continuar" : "Começar"}
          </button>
        )}
        {phase !== "focus" ? (
          <RoundButton label="Pular pausa" onClick={onSkipBreak}>
            <SkipForward className="size-4" />
          </RoundButton>
        ) : (
          <RoundButton label="Ajustes do Pomodoro" onClick={onOpenSettings} disabled={running}>
            <Settings2 className="size-4" />
          </RoundButton>
        )}
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white disabled:opacity-35"
    >
      {children}
    </button>
  );
}

const FIELD_LABELS: Record<CustomField, { label: string; unit: string }> = {
  focus: { label: "Foco", unit: "min" },
  shortBreak: { label: "Pausa curta", unit: "min" },
  longBreak: { label: "Pausa longa", unit: "min" },
  longEvery: { label: "Pausa longa a cada", unit: "focos" },
};

/** Ajustes: modelos prontos ou personalizado com − / +. */
export function PomodoroSettings({
  presetId,
  custom,
  onPick,
  onStep,
  onClose,
}: {
  presetId: string;
  custom: PomodoroPreset;
  onPick: (id: string) => void;
  onStep: (field: CustomField, dir: 1 | -1) => void;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-4" data-testid="pomodoro-settings">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Ajustes</span>
        <RoundButton label="Fechar ajustes" onClick={onClose}>
          <X className="size-4" />
        </RoundButton>
      </div>
      <label className="grid gap-1.5 text-xs text-white/60">
        Tipo de Pomodoro
        <select
          className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white [&>option]:text-black"
          value={presetId}
          onChange={(e) => onPick(e.target.value)}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="personalizado">Personalizado</option>
        </select>
      </label>
      {presetId === "personalizado" && (
        <ul className="grid divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
          {(Object.keys(FIELD_LABELS) as CustomField[]).map((f) => {
            const { min, max } = CUSTOM_LIMITS[f];
            return (
              <li key={f} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white">
                <span>{FIELD_LABELS[f].label}</span>
                <span className="flex items-center gap-2">
                  <RoundButton label={`Diminuir ${FIELD_LABELS[f].label}`} onClick={() => onStep(f, -1)} disabled={custom[f] <= min}>
                    <Minus className="size-3.5" />
                  </RoundButton>
                  <span className="w-16 text-center tabular-nums" data-testid={`custom-${f}`}>
                    <span className="text-lg font-semibold">{custom[f]}</span> <span className="text-xs text-white/60">{FIELD_LABELS[f].unit}</span>
                  </span>
                  <RoundButton label={`Aumentar ${FIELD_LABELS[f].label}`} onClick={() => onStep(f, 1)} disabled={custom[f] >= max}>
                    <Plus className="size-3.5" />
                  </RoundButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

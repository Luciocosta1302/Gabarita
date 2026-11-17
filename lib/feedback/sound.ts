"use client";

/**
 * Sons curtos do Gabarita, gerados no navegador (Web Audio, sem arquivos).
 * Timbre de koto/sino na escala pentatônica japonesa (miyako-bushi: mi, fá, lá, si, dó).
 * Ligados por padrão; o aluno desliga no quiz/revisão ou em Perfil (preferência no navegador).
 */

export type SoundName = "tap" | "correct" | "wrong" | "stamp" | "complete" | "bell";

const KEY = "gabarita:som";
const EVENT = "gabarita:som";
// miyako-bushi em mi: E4 F4 A4 B4 C5 E5 F5 A5 B5 C6
const SCALE = [329.63, 349.23, 440.0, 493.88, 523.25, 659.25, 698.46, 880.0, 987.77, 1046.5];

let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* navegação privada: só não lembra */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onSoundChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Corda dedilhada (koto): seno + harmônico, ataque rápido e decaimento. */
function pluck(a: AudioContext, freq: number, at: number, { vol = 0.16, decay = 0.6, bright = 0.35 } = {}) {
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  out.connect(a.destination);
  for (const [mult, g] of [[1, 1], [2, bright], [3, bright / 3]] as const) {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = mult === 1 ? "triangle" : "sine";
    o.frequency.setValueAtTime(freq * mult, at);
    og.gain.value = g;
    o.connect(og).connect(out);
    o.start(at);
    o.stop(at + decay + 0.05);
  }
}

/** Batida abafada (carimbo no papel): ruído filtrado + grave curto. */
function thud(a: AudioContext, at: number, vol = 0.22) {
  const len = Math.floor(a.sampleRate * 0.12);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(lp).connect(g).connect(a.destination);
  src.start(at);
  const o = a.createOscillator();
  const og = a.createGain();
  o.frequency.setValueAtTime(140, at);
  o.frequency.exponentialRampToValueAtTime(60, at + 0.12);
  og.gain.setValueAtTime(vol, at);
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
  o.connect(og).connect(a.destination);
  o.start(at);
  o.stop(at + 0.16);
}

/**
 * Toca um som (se o aluno não desligou). `combo` = acertos seguidos: o acerto sobe de tom.
 */
export function play(name: SoundName, { combo = 0 } = {}) {
  if (!soundEnabled()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.01;
  switch (name) {
    case "tap":
      pluck(a, SCALE[5], t, { vol: 0.05, decay: 0.12, bright: 0.1 });
      break;
    case "correct": {
      const base = Math.min(combo, 4);
      pluck(a, SCALE[2 + base], t, { vol: 0.14, decay: 0.5 });
      pluck(a, SCALE[4 + base], t + 0.09, { vol: 0.16, decay: 0.8 });
      break;
    }
    case "wrong":
      pluck(a, SCALE[1] / 2, t, { vol: 0.14, decay: 0.35, bright: 0.1 });
      pluck(a, SCALE[0] / 2, t + 0.12, { vol: 0.12, decay: 0.45, bright: 0.1 });
      break;
    case "stamp":
      thud(a, t);
      break;
    case "complete":
      [0, 2, 4, 5, 7].forEach((n, i) => pluck(a, SCALE[n], t + i * 0.09, { vol: 0.13, decay: 0.9 }));
      thud(a, t + 0.5, 0.18);
      break;
    case "bell":
      // sino de templo: parciais inarmônicas, decaimento longo
      for (const [f, v, d] of [[220, 0.14, 3.2], [220 * 2.76, 0.06, 2.2], [220 * 5.4, 0.03, 1.4]] as const) pluck(a, f, t, { vol: v, decay: d, bright: 0 });
      break;
  }
}

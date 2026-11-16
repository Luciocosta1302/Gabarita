/**
 * Som ambiente do Espaço de estudos, gerado no navegador (Web Audio API) — sem arquivos de áudio
 * e sem música de terceiros:
 * - chuva: ruído marrom + chiado agudo filtrados;
 * - lo-fi: progressão de acordes suave com baixo, bateria "de escovinha" e chiado de vinil, composta na hora;
 * - sino: aviso de fim de fase do Pomodoro.
 * Só funciona depois de um clique do usuário (regra dos navegadores).
 */

type Ctx = AudioContext;

const BPM = 72;
const BEAT = 60 / BPM;
// Fmaj7 → Em7 → Dm7 → Cmaj7 (uma por compasso), em Hz
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63],
  [164.81, 196.0, 246.94, 293.66],
  [146.83, 174.61, 220.0, 261.63],
  [130.81, 164.81, 196.0, 246.94],
];
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0]; // pentatônica de Dó

function noiseBuffer(ctx: Ctx, seconds: number, kind: "white" | "brown" | "crackle") {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w;
    else if (kind === "brown") {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = Math.random() < 0.0004 ? w * 0.8 : w * 0.01;
  }
  return buf;
}

export class Ambience {
  private ctx: Ctx | null = null;
  private rainGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private noise: AudioBuffer | null = null;

  /** Cria o contexto (precisa vir de um clique). */
  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.noise = noiseBuffer(ctx, 2, "white");

    // chuva
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(ctx.destination);
    const brown = ctx.createBufferSource();
    brown.buffer = noiseBuffer(ctx, 4, "brown");
    brown.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    brown.connect(lp).connect(this.rainGain);
    const hiss = ctx.createBufferSource();
    hiss.buffer = noiseBuffer(ctx, 3, "white");
    hiss.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4000;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.06;
    hiss.connect(hp).connect(hissGain).connect(this.rainGain);
    brown.start();
    hiss.start();

    // música
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 2200;
    this.musicGain.connect(warm).connect(ctx.destination);
    const vinyl = ctx.createBufferSource();
    vinyl.buffer = noiseBuffer(ctx, 5, "crackle");
    vinyl.loop = true;
    const vinylGain = ctx.createGain();
    vinylGain.gain.value = 0.5;
    vinyl.connect(vinylGain).connect(this.musicGain);
    vinyl.start();
    return ctx;
  }

  setRain(volume: number) {
    const ctx = this.ensure();
    if (!ctx || !this.rainGain) return;
    void ctx.resume();
    this.rainGain.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.4);
  }

  setMusic(volume: number) {
    const ctx = this.ensure();
    if (!ctx || !this.musicGain) return;
    void ctx.resume();
    this.musicGain.gain.setTargetAtTime(volume * 0.35, ctx.currentTime, 0.4);
    if (volume > 0 && !this.timer) {
      this.nextBeat = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 100);
    }
    if (volume === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Sino de fim de fase. */
  chime() {
    const ctx = this.ensure();
    if (!ctx) return;
    void ctx.resume();
    [880, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 2.6);
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close();
    this.ctx = null;
  }

  // --- composição em tempo real ------------------------------------------------

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    while (this.nextBeat < ctx.currentTime + 0.3) {
      this.playBeat(this.beat, this.nextBeat);
      this.beat++;
      this.nextBeat += BEAT;
    }
  }

  private playBeat(beat: number, t: number) {
    const bar = Math.floor(beat / 4) % CHORDS.length;
    const inBar = beat % 4;
    const chord = CHORDS[bar];
    if (inBar === 0) {
      chord.forEach((f) => this.tone(f, t, BEAT * 4, "triangle", 0.05, 0.4));
      this.tone(chord[0] / 2, t, BEAT * 1.8, "sine", 0.18, 0.02);
    }
    if (inBar === 2) this.tone(chord[0] / 2, t, BEAT * 1.5, "sine", 0.14, 0.02);
    // bateria: bumbo no 1 e no "e" do 2, caixa de escovinha no 2 e 4, chimbal com swing
    if (inBar === 0 || (inBar === 1 && bar % 2 === 1)) this.kick(inBar === 1 ? t + BEAT * 0.6 : t);
    if (inBar === 1 || inBar === 3) this.noiseHit(t, 1800, 0.12, 0.18);
    this.noiseHit(t, 7000, 0.03, 0.05);
    this.noiseHit(t + BEAT * 0.62, 7000, 0.02, 0.04);
    // melodia esparsa
    if (Math.random() < 0.35) {
      const n = MELODY[Math.floor(Math.random() * MELODY.length)];
      this.tone(n, t + (Math.random() < 0.5 ? 0 : BEAT * 0.5), BEAT * 1.2, "sine", 0.05, 0.01);
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, attack: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 8; // leve desafinação de fita
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicGain!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.musicGain!);
    o.start(t);
    o.stop(t + 0.32);
  }

  private noiseHit(t: number, freq: number, vol: number, dur: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = freq > 5000 ? "highpass" : "bandpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.musicGain!);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }
}

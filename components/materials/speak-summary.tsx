"use client";

import { Headphones, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { selectClass } from "@/lib/api/client";

/** D13 — lê o resumo em voz alta (Web Speech API do navegador, grátis), para ouvir no ônibus. */
export function SpeakSummary({ text }: { text: string }) {
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const utter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return <p className="text-muted-foreground text-xs">Seu navegador não lê textos em voz alta.</p>;

  function play() {
    const synth = window.speechSynthesis;
    if (state === "paused") {
      synth.resume();
      setState("playing");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = rate;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br")) ?? synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"));
    if (voice) u.voice = voice;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utter.current = u;
    synth.speak(u);
    setState("playing");
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="speak-summary">
      {state === "playing" ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            window.speechSynthesis.pause();
            setState("paused");
          }}
        >
          <Pause aria-hidden className="size-4" /> Pausar
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={play}>
          <Headphones aria-hidden className="size-4" /> {state === "paused" ? "Continuar" : "Ouvir resumo"}
        </Button>
      )}
      {state !== "idle" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            window.speechSynthesis.cancel();
            setState("idle");
          }}
        >
          ■ Parar
        </Button>
      )}
      <select aria-label="Velocidade" className={`${selectClass} h-8`} value={rate} onChange={(e) => setRate(Number(e.target.value))} disabled={state !== "idle"}>
        {[0.9, 1, 1.25, 1.5].map((r) => (
          <option key={r} value={r}>
            {r.toLocaleString("pt-BR")}x
          </option>
        ))}
      </select>
    </div>
  );
}

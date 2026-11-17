"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Daruma } from "@/components/brand/daruma";
import { Hanko } from "@/components/brand/hanko";
import { Mochi } from "@/components/brand/mochi";
import { Button } from "@/components/ui/button";
import { Counter } from "@/components/ui/counter";
import { petalRain } from "@/lib/feedback/celebrate";
import { play } from "@/lib/feedback/sound";

/**
 * Comemoração de tela cheia (fim de quiz, revisão do dia, plano do dia): a Mochi pula, o Daru
 * pinta o segundo olho, o selo 合格 bate no papel e caem pétalas. Fecha com "Continuar" ou Esc.
 */
export function Celebration({
  title,
  subtitle,
  stats,
  onContinue,
  continueLabel = "Continuar",
}: {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: number; suffix?: string }[];
  onContinue: () => void;
  continueLabel?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  // vai direto para o <body>: nada da página (animações, rolagem) prende a tela cheia
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // a função pode mudar a cada render do pai: guarda a última sem refazer a comemoração
  const continueRef = useRef(onContinue);
  useEffect(() => {
    continueRef.current = onContinue;
  }, [onContinue]);
  useEffect(() => {
    if (!mounted) return;
    play("complete");
    petalRain();
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && continueRef.current();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div className="bg-washi/95 fixed inset-0 z-[70] grid place-items-center p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="celebration-title" data-testid="celebration">
      <div className="grid w-full max-w-md justify-items-center gap-5 text-center">
        <div className="relative flex items-end justify-center gap-2">
          <Mochi mood="comemorando" className="animate-hop w-28" title="Mochi comemorando" />
          <Daruma mood="comemorando" eyes="dois" className="animate-char-pop w-32 [animation-delay:150ms]" title="Daru com os dois olhos pintados" />
          <Hanko text="合格" className="animate-seal absolute -top-6 -right-10 size-20 [animation-delay:450ms] [--r:-10deg]" rotate={-10} label="selo de aprovado" />
        </div>
        <div className="animate-slide-up grid gap-1 [animation-delay:200ms]">
          <h2 id="celebration-title" className="text-3xl md:text-4xl">
            {title}
          </h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {stats && stats.length > 0 && (
          <dl className="animate-slide-up grid w-full grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-3 [animation-delay:320ms]">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-2xl border-2 border-ink p-3 shadow-[0_3px_0_var(--ink)]">
                <dt className="text-muted-foreground text-xs font-bold tracking-wide uppercase">{s.label}</dt>
                <dd className="font-display text-2xl font-extrabold">
                  <Counter value={s.value} />
                  {s.suffix}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Button ref={btn} size="lg" className="animate-slide-up w-full max-w-xs [animation-delay:420ms]" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Número que sobe até o valor quando aparece na tela (ideia do Counter do Animata, MIT; sem bibliotecas).
 * Sem JavaScript ou com "reduzir movimento", mostra o valor final direto.
 */
export function Counter({ value, duration = 700, className, format = (n: number) => n.toLocaleString("pt-BR") }: { value: number; duration?: number; className?: string; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    setShown(0);
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden className="tabular-nums">
        {format(shown)}
      </span>
    </span>
  );
}

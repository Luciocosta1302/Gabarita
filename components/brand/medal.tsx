import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Medalha de conquista: selo redondo com um kanji (desenho próprio, no estilo do Hanko).
 * Conquistada = vermelho-selo com anel dourado; trancada = carimbo apagado.
 */
export function Medal({ kanji, meaning, unlocked, className }: { kanji: string; meaning?: string; unlocked: boolean; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} role="img" aria-label={meaning ? `${kanji} (${meaning})` : kanji}>
      <defs>
        <filter id={`m-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={unlocked ? 1.6 : 2.4} />
        </filter>
      </defs>
      <g filter={`url(#m-${uid})`}>
        <circle cx="32" cy="32" r="29" fill={unlocked ? "#c8372d" : "none"} stroke={unlocked ? "#1f1a17" : "#1f1a17"} strokeOpacity={unlocked ? 1 : 0.25} strokeWidth="2.5" strokeDasharray={unlocked ? undefined : "4 3"} />
        <circle cx="32" cy="32" r="23" fill="none" stroke={unlocked ? "#e3b45a" : "#1f1a17"} strokeOpacity={unlocked ? 1 : 0.18} strokeWidth="2" />
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fontFamily="'Shippori Mincho', serif"
          fontWeight="800"
          fontSize="27"
          fill={unlocked ? "#fbf4e8" : "#1f1a17"}
          fillOpacity={unlocked ? 1 : 0.28}
        >
          {kanji}
        </text>
      </g>
    </svg>
  );
}

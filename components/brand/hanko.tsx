import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Hanko — selo vermelho carimbado. 合 = de 合格, "passar na prova": a marca do Gabarita.
 * A borda e o preenchimento ganham uma textura irregular, como tinta de carimbo de verdade.
 */
export function Hanko({
  text = "合",
  className,
  rotate = -4,
  faded = false,
  label,
}: {
  text?: string;
  className?: string;
  rotate?: number;
  /** carimbo "fraco" (ex.: dia ainda não estudado) */
  faded?: boolean;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const vertical = text.length > 1;
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <filter id={`ink-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
        <mask id={`grain-${uid}`}>
          <rect width="64" height="64" fill="#fff" />
          <filter id={`speck-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.25" />
          </filter>
          <rect width="64" height="64" filter={`url(#speck-${uid})`} />
        </mask>
      </defs>
      <g filter={`url(#ink-${uid})`} mask={`url(#grain-${uid})`} opacity={faded ? 0.18 : 1}>
        <rect x="4" y="4" width="56" height="56" rx="6" fill="#c8372d" />
        <rect x="9" y="9" width="46" height="46" rx="3" fill="none" stroke="#fbf4e8" strokeWidth="2" />
        {vertical ? (
          <text x="32" y="30" textAnchor="middle" fill="#fbf4e8" fontFamily="'Shippori Mincho', serif" fontWeight="800" fontSize="17">
            <tspan x="32" dy="0">
              {text[0]}
            </tspan>
            <tspan x="32" dy="18">
              {text[1]}
            </tspan>
          </text>
        ) : (
          <text x="32" y="44" textAnchor="middle" fill="#fbf4e8" fontFamily="'Shippori Mincho', serif" fontWeight="800" fontSize="34">
            {text}
          </text>
        )}
      </g>
    </svg>
  );
}

/** Logo: selo 合 + nome em mincho. */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("font-display flex items-center gap-2.5 text-2xl font-extrabold tracking-tight", light ? "text-[#f4efe4]" : "text-ink", className)}>
      <Hanko className="size-8" rotate={-6} />
      Gabarita
    </span>
  );
}

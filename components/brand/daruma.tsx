import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Daruma — mascote do Gabarita (desenho próprio).
 * Tradição: pinta-se um olho ao definir um objetivo e o outro quando ele é alcançado.
 * Aqui: matéria com data de prova = um olho; prova feita/etapa concluída = os dois.
 */
export type DarumaMood = "feliz" | "animado" | "pensando" | "sonolento" | "comemorando";

export function Daruma({
  mood = "feliz",
  eyes = "dois",
  className,
  title = "Daruma, o mascote do Gabarita",
}: {
  mood?: DarumaMood;
  /** "um" = objetivo definido, ainda não alcançado */
  eyes?: "um" | "dois";
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const ink = "#1f1a17";
  return (
    <svg viewBox="0 0 120 132" className={cn("overflow-visible", className)} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <defs>
        <radialGradient id={`body-${uid}`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#e0503f" />
          <stop offset="70%" stopColor="#c8372d" />
          <stop offset="100%" stopColor="#a52a22" />
        </radialGradient>
      </defs>
      {/* sombra no chão */}
      <ellipse cx="60" cy="126" rx="38" ry="5" fill={ink} opacity=".12" />
      {/* braços levantados ao comemorar */}
      {mood === "comemorando" && (
        <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="#c8372d">
          <path d="M12 74 Q-4 58 0 36" fill="none" strokeWidth="5" stroke="#c8372d" />
          <path d="M108 74 Q124 58 120 36" fill="none" strokeWidth="5" stroke="#c8372d" />
          <path d="M12 74 Q-4 58 0 36" fill="none" strokeWidth="1.5" />
          <path d="M108 74 Q124 58 120 36" fill="none" strokeWidth="1.5" />
          <circle cx="0" cy="33" r="6" />
          <circle cx="120" cy="33" r="6" />
        </g>
      )}
      {/* corpo */}
      <path
        d="M60 6 C92 6 112 34 112 70 C112 104 90 122 60 122 C30 122 8 104 8 70 C8 34 28 6 60 6 Z"
        fill={`url(#body-${uid})`}
        stroke={ink}
        strokeWidth="3"
      />
      {/* faixa dourada da barriga com 合格 (passar na prova) */}
      <path d="M26 98 Q60 112 94 98" fill="none" stroke="#c79a3a" strokeWidth="3" strokeLinecap="round" />
      <text x="60" y="94" textAnchor="middle" fontSize="13" fontWeight="800" fill="#f3d27a" fontFamily="'Shippori Mincho', serif">
        合格
      </text>
      {/* rosto */}
      <path
        d="M60 22 C82 22 94 36 94 52 C94 70 80 80 60 80 C40 80 26 70 26 52 C26 36 38 22 60 22 Z"
        fill="#fbf4e8"
        stroke={ink}
        strokeWidth="2.5"
      />
      {/* sobrancelhas grossas (como asas de grou) */}
      <g stroke={ink} strokeLinecap="round" fill="none">
        {mood === "pensando" ? (
          <>
            <path d="M34 36 Q42 30 51 35" strokeWidth="4" />
            <path d="M69 33 Q78 29 86 34" strokeWidth="4" />
          </>
        ) : (
          <>
            <path d="M33 37 Q42 29 52 35" strokeWidth="4.5" />
            <path d="M68 35 Q78 29 87 37" strokeWidth="4.5" />
          </>
        )}
      </g>
      {/* olhos */}
      <Eyes mood={mood} one={eyes === "um"} ink={ink} />
      {/* bochechas */}
      <ellipse cx="36" cy="60" rx="5" ry="3" fill="#e8a29b" opacity=".7" />
      <ellipse cx="84" cy="60" rx="5" ry="3" fill="#e8a29b" opacity=".7" />
      {/* bigode/barba estilizados + boca */}
      <g stroke={ink} strokeLinecap="round" fill="none" strokeWidth="2.5">
        <path d="M46 66 Q53 62 58 66" />
        <path d="M62 66 Q67 62 74 66" />
        {mood === "animado" || mood === "comemorando" ? (
          <path d="M53 70 Q60 78 67 70 Z" fill="#9b2a22" />
        ) : mood === "sonolento" ? (
          <ellipse cx="60" cy="72" rx="3" ry="2.5" fill={ink} stroke="none" />
        ) : mood === "pensando" ? (
          <path d="M55 72 L65 71" />
        ) : (
          <path d="M54 70 Q60 75 66 70" />
        )}
      </g>
      {mood === "sonolento" && (
        <text x="98" y="20" fontSize="14" fontWeight="700" fill={ink} fontFamily="'Zen Maru Gothic', sans-serif">
          z
        </text>
      )}
      {mood === "pensando" && (
        <g fill={ink}>
          <circle cx="100" cy="22" r="2.5" />
          <circle cx="106" cy="14" r="3.5" />
        </g>
      )}
    </svg>
  );
}

function Eyes({ mood, one, ink }: { mood: DarumaMood; one: boolean; ink: string }) {
  if (mood === "feliz" || mood === "comemorando") {
    // olhos fechados de alegria (^ ^); o olho "não pintado" continua vazio
    return (
      <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M37 48 Q43 41 49 48" />
        {one ? <circle cx="77" cy="47" r="7" fill="#fbf4e8" strokeWidth="2.5" /> : <path d="M71 48 Q77 41 83 48" />}
      </g>
    );
  }
  if (mood === "sonolento") {
    return (
      <g stroke={ink} strokeWidth="3" strokeLinecap="round">
        <path d="M37 48 L49 48" />
        <path d="M71 48 L83 48" />
      </g>
    );
  }
  return (
    <g>
      <circle cx="43" cy="47" r="7.5" fill="#fff" stroke={ink} strokeWidth="2.5" />
      <circle cx="44" cy="48" r="4.2" fill={ink} />
      <circle cx="45.5" cy="46" r="1.3" fill="#fff" />
      <circle cx="77" cy="47" r="7.5" fill="#fff" stroke={ink} strokeWidth="2.5" />
      {!one && (
        <>
          <circle cx="78" cy="48" r="4.2" fill={ink} />
          <circle cx="79.5" cy="46" r="1.3" fill="#fff" />
        </>
      )}
    </g>
  );
}

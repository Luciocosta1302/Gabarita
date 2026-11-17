import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Mochi — gatinha japonesa tricolor (mike-neko, rabinho curto), coleira vermelha com sininho.
 * Fofa e animada: recebe o aluno, comemora acertos e faz companhia no foco. Desenho próprio.
 */
export type MochiMood = "feliz" | "animada" | "pensando" | "dormindo" | "comemorando";

const INK = "#1f1a17";
const FUR = "#fbf4e8";
const ORANGE = "#e39a4f";
const BLACK = "#3a2f2a";
const PINK = "#eba3a0";

export type MochiColors = { fur: string; p1: string; p2: string };

export function Mochi({
  mood = "feliz",
  className,
  title = "Mochi, a gatinha do Gabarita",
  colors,
  children,
}: {
  mood?: MochiMood;
  className?: string;
  title?: string;
  /** pelagem (avatar do aluno); padrão = tricolor */
  colors?: Partial<MochiColors>;
  /** roupas/acessórios desenhados por cima (avatar) */
  children?: React.ReactNode;
}) {
  const c = { fur: FUR, p1: ORANGE, p2: BLACK, ...colors };
  const uid = useId().replace(/:/g, "");
  const waving = mood === "comemorando" || mood === "animada";
  return (
    <svg
      viewBox="0 0 120 132"
      className={cn("char char-mochi overflow-visible", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <defs>
        <clipPath id={`body-${uid}`}>
          <path d="M30 76 C28 104 36 122 60 122 C84 122 92 104 90 76 Z" />
        </clipPath>
        <clipPath id={`head-${uid}`}>
          <ellipse cx="60" cy="56" rx="40" ry="34" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="126" rx="34" ry="5" fill={INK} opacity=".12" />
      <g className="char-body">

      {/* rabinho curto (bobtail), atrás do corpo */}
      <circle className="mochi-tail" cx="92" cy="112" r="8" fill={c.p1} stroke={INK} strokeWidth="2.5" />

      {/* corpo */}
      <path d="M30 76 C28 104 36 122 60 122 C84 122 92 104 90 76 Z" fill={c.fur} stroke={INK} strokeWidth="3" />
      <g clipPath={`url(#body-${uid})`}>
        <ellipse cx="34" cy="110" rx="14" ry="12" fill={c.p1} />
        <ellipse cx="86" cy="96" rx="9" ry="12" fill={c.p2} />
      </g>
      <path d="M30 76 C28 104 36 122 60 122 C84 122 92 104 90 76 Z" fill="none" stroke={INK} strokeWidth="3" />

      {/* patas da frente (a direita levanta para acenar, como a maneki-neko) */}
      {!waving && <ellipse cx="72" cy="118" rx="9" ry="6" fill={c.fur} stroke={INK} strokeWidth="2.5" />}
      <ellipse cx="48" cy="118" rx="9" ry="6" fill={c.fur} stroke={INK} strokeWidth="2.5" />

      {/* orelhas */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M24 44 L26 12 L50 28 Z" fill={c.p1} />
        <path d="M96 44 L94 12 L70 28 Z" fill={c.p2} />
        <path d="M30 36 L31 20 L43 29 Z" fill={PINK} strokeWidth="0" />
        <path d="M90 36 L89 20 L77 29 Z" fill={PINK} strokeWidth="0" />
      </g>

      {/* cabeça */}
      <ellipse cx="60" cy="56" rx="40" ry="34" fill={c.fur} stroke={INK} strokeWidth="3" />
      <g clipPath={`url(#head-${uid})`}>
        <path d="M20 22 C34 22 48 32 46 50 C36 52 24 50 18 44 Z" fill={c.p1} />
        <path d="M100 22 C86 22 74 30 76 46 C86 48 96 46 102 40 Z" fill={c.p2} />
      </g>
      <ellipse cx="60" cy="56" rx="40" ry="34" fill="none" stroke={INK} strokeWidth="3" />

      <Face mood={mood} />

      {/* coleira vermelha com sininho dourado (suzu) */}
      <path d="M32 82 Q60 94 88 82" fill="none" stroke="#c8372d" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 82 Q60 94 88 82" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
      <circle cx="60" cy="93" r="6" fill="#e3b45a" stroke={INK} strokeWidth="2" />
      <path d="M56 93 L64 93 M60 93 L60 98" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

      {/* pata acenando */}
      {waving && (
        <g className="mochi-paw">
          <path d="M84 84 Q102 70 98 46" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
          <path d="M84 84 Q102 70 98 46" fill="none" stroke={c.fur} strokeWidth="9" strokeLinecap="round" />
          <circle cx="98" cy="44" r="8" fill={c.fur} stroke={INK} strokeWidth="2.5" />
          <circle cx="98" cy="45" r="2.4" fill={PINK} />
        </g>
      )}

      {mood === "dormindo" && (
        <text x="100" y="18" fontSize="13" fontWeight="700" fill={INK} fontFamily="'Zen Maru Gothic', sans-serif">
          zz
        </text>
      )}
      {mood === "comemorando" && (
        <g fill="#c8372d">
          <path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
          <path d="M108 8 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" fill="#e3b45a" />
        </g>
      )}
      {children}
      </g>
    </svg>
  );
}

function Face({ mood }: { mood: MochiMood }) {
  const closed = mood === "feliz" || mood === "comemorando";
  return (
    <g>
      {/* olhos */}
      <g className={mood === "dormindo" ? undefined : "char-eyes"}>
      {mood === "dormindo" ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M38 58 Q44 63 50 58" />
          <path d="M70 58 Q76 63 82 58" />
        </g>
      ) : closed ? (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M38 58 Q44 51 50 58" />
          <path d="M70 58 Q76 51 82 58" />
        </g>
      ) : (
        <g>
          <ellipse cx="44" cy="56" rx="6" ry={mood === "animada" ? 7.5 : 7} fill={INK} />
          <ellipse cx="76" cy="56" rx="6" ry={mood === "animada" ? 7.5 : 7} fill={INK} />
          <circle cx="46" cy="53" r="2.2" fill="#fff" />
          <circle cx="78" cy="53" r="2.2" fill="#fff" />
          {mood === "pensando" && <path d="M36 44 Q44 40 52 44" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
        </g>
      )}
      </g>
      {/* bochechas */}
      <ellipse cx="36" cy="68" rx="5.5" ry="3.2" fill={PINK} opacity=".75" />
      <ellipse cx="84" cy="68" rx="5.5" ry="3.2" fill={PINK} opacity=".75" />
      {/* nariz + boca "ω" */}
      <path d="M57 64 L63 64 L60 67.5 Z" fill={PINK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      {mood === "comemorando" || mood === "animada" ? (
        <path d="M53 70 Q60 80 67 70 Z" fill="#b8423a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      ) : mood === "pensando" ? (
        <path d="M56 72 L64 71" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M52 69 Q56 73 60 69 Q64 73 68 69" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      )}
      {/* bigodes */}
      <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity=".8">
        <path d="M24 64 L34 66" />
        <path d="M24 71 L34 70" />
        <path d="M96 64 L86 66" />
        <path d="M96 71 L86 70" />
      </g>
    </g>
  );
}

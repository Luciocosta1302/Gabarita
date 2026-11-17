import { cn } from "@/lib/utils";

/**
 * Fuku — corujinha professora. Em japonês, coruja é fukurō, que soa como 不苦労 ("sem sofrimento"):
 * amuleto de sabedoria e de sorte nos estudos. Calma e paciente: explica, cita o material. Desenho próprio.
 */
export type FukuMood = "explicando" | "pensando" | "feliz" | "surpresa";

const INK = "#1f1a17";
const FEATHER = "#7a5a43";
const FEATHER_DARK = "#5b4232";
const BELLY = "#f1e2c8";

export function Fuku({ mood = "explicando", className, title = "Fuku, a coruja professora" }: { mood?: FukuMood; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 120 132"
      className={cn("overflow-visible", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <ellipse cx="60" cy="126" rx="32" ry="5" fill={INK} opacity=".12" />
      {/* galho */}
      <path d="M14 120 L106 120" stroke="#6b4f3a" strokeWidth="6" strokeLinecap="round" />
      <path d="M86 120 Q96 112 102 114" stroke="#6b4f3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="104" cy="112" rx="5" ry="3" fill="#5d8a3a" transform="rotate(-25 104 112)" />

      {/* corpo (gota arredondada) com tufos de orelha */}
      <path
        d="M60 14 C66 14 72 8 80 4 C80 12 84 18 88 22 C100 34 102 56 100 80 C98 104 82 118 60 118 C38 118 22 104 20 80 C18 56 20 34 32 22 C36 18 40 12 40 4 C48 8 54 14 60 14 Z"
        fill={FEATHER}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* asas */}
      <path d="M22 70 C14 84 18 102 32 108 C30 92 30 80 34 68 Z" fill={FEATHER_DARK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M98 70 C106 84 102 102 88 108 C90 92 90 80 86 68 Z" fill={FEATHER_DARK} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* barriga com penas em ondas (seigaiha) */}
      <path d="M60 62 C78 62 86 78 84 94 C82 108 72 114 60 114 C48 114 38 108 36 94 C34 78 42 62 60 62 Z" fill={BELLY} stroke={INK} strokeWidth="2" />
      <g fill="none" stroke={FEATHER} strokeWidth="1.6" strokeLinecap="round" opacity=".8">
        {[78, 88, 98].map((y) =>
          [44, 52, 60, 68, 76].map((x) => (y === 98 && (x === 44 || x === 76) ? null : <path key={`${x}-${y}`} d={`M${x - 4} ${y} Q${x} ${y + 5} ${x + 4} ${y}`} />)),
        )}
      </g>
      {/* disco do rosto */}
      <path d="M60 26 C72 20 90 26 92 44 C94 58 82 66 60 62 C38 66 26 58 28 44 C30 26 48 20 60 26 Z" fill={BELLY} stroke={INK} strokeWidth="2.5" />

      {/* olhos grandes + óculos redondos */}
      <Eyes mood={mood} />
      <g fill="none" stroke={INK} strokeWidth="2.6">
        <circle cx="45" cy="45" r="12" />
        <circle cx="75" cy="45" r="12" />
        <path d="M57 44 Q60 41 63 44" />
      </g>
      {/* bico */}
      <path d="M56 54 L64 54 L60 62 Z" fill="#e3a64a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {mood === "surpresa" && <ellipse cx="60" cy="66" rx="3" ry="2.4" fill={INK} />}
      {/* bochechas */}
      <ellipse cx="34" cy="56" rx="4" ry="2.4" fill="#eba3a0" opacity=".7" />
      <ellipse cx="86" cy="56" rx="4" ry="2.4" fill="#eba3a0" opacity=".7" />
      {/* pés */}
      <g fill="#e3a64a" stroke={INK} strokeWidth="2">
        <path d="M46 116 l-4 6 h4 l2 -3 2 3 h4 l-4 -6 z" />
        <path d="M70 116 l-4 6 h4 l2 -3 2 3 h4 l-4 -6 z" />
      </g>
      {/* explicando: segura um livrinho aberto */}
      {mood === "explicando" && (
        <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
          <path d="M40 92 L60 96 L60 112 L40 108 Z" fill="#fbf4e8" />
          <path d="M80 92 L60 96 L60 112 L80 108 Z" fill="#fbf4e8" />
          <path d="M44 99 L56 101 M44 103 L56 105 M64 101 L76 99 M64 105 L76 103" strokeWidth="1.2" opacity=".6" />
          <path d="M60 96 L60 112" />
          <path d="M66 94 L66 104" stroke="#c8372d" strokeWidth="2.5" />
        </g>
      )}
      {mood === "pensando" && (
        <g fill={INK}>
          <circle cx="104" cy="30" r="2.5" />
          <circle cx="110" cy="20" r="3.5" />
        </g>
      )}
    </svg>
  );
}

function Eyes({ mood }: { mood: FukuMood }) {
  if (mood === "feliz") {
    return (
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M39 47 Q45 40 51 47" />
        <path d="M69 47 Q75 40 81 47" />
      </g>
    );
  }
  const r = mood === "surpresa" ? 8 : 7;
  const look = mood === "pensando" ? -2 : 0;
  return (
    <g>
      <circle cx="45" cy="45" r={r + 1} fill="#fff" />
      <circle cx="75" cy="45" r={r + 1} fill="#fff" />
      <circle cx={45 + look} cy={45 + look} r={r - 2.5} fill={INK} />
      <circle cx={75 + look} cy={45 + look} r={r - 2.5} fill={INK} />
      <circle cx={46.5 + look} cy={43 + look} r="1.6" fill="#fff" />
      <circle cx={76.5 + look} cy={43 + look} r="1.6" fill="#fff" />
    </g>
  );
}

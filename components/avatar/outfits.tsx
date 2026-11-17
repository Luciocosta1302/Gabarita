import type { Avatar, Who } from "@/lib/avatar/avatar";

/**
 * Roupas e acessórios do avatar, desenhados por cima do personagem (mesmo traço de tinta).
 * Cada personagem tem um "encaixe": topo da cabeça, testa, largura da cabeça e pescoço (viewBox 120×132).
 */
const INK = "#1f1a17";
const ANCHOR: Record<Who, { top: number; band: number; cx: number; w: number; neck: number; earY: number }> = {
  mochi: { top: 24, band: 37, cx: 60, w: 76, neck: 87, earY: 50 },
  daru: { top: 8, band: 15, cx: 60, w: 66, neck: 85, earY: 40 },
  fuku: { top: 16, band: 22, cx: 60, w: 64, neck: 68, earY: 40 },
};

export function HeadItem({ who, item }: { who: Who; item: Avatar["head"] }) {
  const a = ANCHOR[who];
  const L = a.cx - a.w / 2;
  const R = a.cx + a.w / 2;
  switch (item) {
    case "hachimaki":
      // faixa branca na testa com 必勝 ("vitória certa") e as pontas soltas
      return (
        <g data-item="hachimaki">
          <path d={`M${R - 6} ${a.band} q12 2 18 12 q-9 -1 -14 -6 z`} fill="#fbf4e8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${R - 6} ${a.band + 2} q14 -4 20 4 q-10 2 -16 0 z`} fill="#fbf4e8" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d={`M${L} ${a.band - 4} Q${a.cx} ${a.band - 9} ${R} ${a.band - 4} L${R} ${a.band + 4} Q${a.cx} ${a.band - 1} ${L} ${a.band + 4} Z`} fill="#fbf4e8" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx={a.cx} cy={a.band - 2.5} r="4.2" fill="#c8372d" />
          <text x={a.cx - 13} y={a.band + 1.2} fontSize="6.5" fontWeight="800" fill="#c8372d" fontFamily="'Shippori Mincho', serif">
            必
          </text>
          <text x={a.cx + 7} y={a.band + 1.2} fontSize="6.5" fontWeight="800" fill="#c8372d" fontFamily="'Shippori Mincho', serif">
            勝
          </text>
        </g>
      );
    case "flor":
      return (
        <g data-item="flor" transform={`translate(${R - 10} ${a.top + 6})`}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-6" rx="4.2" ry="6" fill="#f2b8c0" stroke={INK} strokeWidth="1.4" transform={`rotate(${r})`} />
          ))}
          <circle r="2.6" fill="#e3b45a" stroke={INK} strokeWidth="1.2" />
        </g>
      );
    case "laco":
      return (
        <g data-item="laco" transform={`translate(${L + 14} ${a.top + 2}) rotate(-18)`} stroke={INK} strokeWidth="2" strokeLinejoin="round" fill="#c8372d">
          <path d="M0 0 L-13 -8 L-13 8 Z" />
          <path d="M0 0 L13 -8 L13 8 Z" />
          <circle r="3.5" />
        </g>
      );
    case "fones":
      return (
        <g data-item="fones">
          <path d={`M${L + 2} ${a.earY} C${L} ${a.top - 16} ${R} ${a.top - 16} ${R - 2} ${a.earY}`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d={`M${L + 2} ${a.earY} C${L} ${a.top - 16} ${R} ${a.top - 16} ${R - 2} ${a.earY}`} fill="none" stroke="#22334b" strokeWidth="2.5" strokeLinecap="round" />
          {[L - 1, R + 1].map((x) => (
            <rect key={x} x={x - 6} y={a.earY - 9} width="12" height="18" rx="5" fill="#c8372d" stroke={INK} strokeWidth="2.2" />
          ))}
        </g>
      );
    case "kasa":
      // chapéu cônico de palha
      return (
        <g data-item="kasa">
          <path d={`M${a.cx - 46} ${a.top + 6} L${a.cx} ${a.top - 22} L${a.cx + 46} ${a.top + 6} Q${a.cx} ${a.top + 12} ${a.cx - 46} ${a.top + 6} Z`} fill="#d8b46a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <g stroke="#a8843f" strokeWidth="1.3">
            {[-30, -15, 0, 15, 30].map((dx) => (
              <path key={dx} d={`M${a.cx} ${a.top - 20} L${a.cx + dx * 1.35} ${a.top + 7}`} />
            ))}
          </g>
          <circle cx={a.cx} cy={a.top - 21} r="2.4" fill={INK} />
        </g>
      );
    case "capelo":
      // capelo de formatura com borla dourada
      return (
        <g data-item="capelo">
          <path d={`M${a.cx - 16} ${a.top - 6} L${a.cx + 16} ${a.top - 6} L${a.cx + 15} ${a.top + 4} Q${a.cx} ${a.top + 8} ${a.cx - 15} ${a.top + 4} Z`} fill="#2b2522" stroke={INK} strokeWidth="2" />
          <path d={`M${a.cx - 32} ${a.top - 8} L${a.cx} ${a.top - 20} L${a.cx + 32} ${a.top - 8} L${a.cx} ${a.top + 2} Z`} fill="#3a322e" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d={`M${a.cx} ${a.top - 9} L${a.cx + 26} ${a.top - 6} L${a.cx + 27} ${a.top + 12}`} fill="none" stroke="#e3b45a" strokeWidth="2" />
          <path d={`M${a.cx + 24} ${a.top + 10} l3 8 l3 -8 z`} fill="#e3b45a" stroke={INK} strokeWidth="1.2" />
          <circle cx={a.cx} cy={a.top - 9} r="2.2" fill="#e3b45a" />
        </g>
      );
    default:
      return null;
  }
}

export function NeckItem({ who, item }: { who: Who; item: Avatar["neck"] }) {
  const a = ANCHOR[who];
  switch (item) {
    case "cachecol":
      return (
        <g data-item="cachecol" stroke={INK} strokeWidth="2.2" strokeLinejoin="round">
          <path d={`M${a.cx - 30} ${a.neck - 5} Q${a.cx} ${a.neck + 6} ${a.cx + 30} ${a.neck - 5} L${a.cx + 30} ${a.neck + 3} Q${a.cx} ${a.neck + 14} ${a.cx - 30} ${a.neck + 3} Z`} fill="#5d8a3a" />
          <path d={`M${a.cx + 14} ${a.neck + 4} l4 22 l9 -2 l-3 -21 z`} fill="#5d8a3a" />
          <g stroke="#f4efe4" strokeWidth="1.6" opacity=".8">
            <path d={`M${a.cx - 16} ${a.neck + 1} l0 7`} />
            <path d={`M${a.cx} ${a.neck + 3} l0 7`} />
            <path d={`M${a.cx + 18} ${a.neck + 12} l7 -1`} />
          </g>
        </g>
      );
    case "gravata":
      return (
        <g data-item="gravata" transform={`translate(${a.cx} ${a.neck + 2})`} stroke={INK} strokeWidth="2" strokeLinejoin="round" fill="#22334b">
          <path d="M0 0 L-12 -7 L-12 7 Z" />
          <path d="M0 0 L12 -7 L12 7 Z" />
          <circle r="3" fill="#c8372d" />
        </g>
      );
    case "medalha":
      return (
        <g data-item="medalha">
          <path d={`M${a.cx - 9} ${a.neck - 6} L${a.cx} ${a.neck + 8} L${a.cx + 9} ${a.neck - 6}`} fill="none" stroke="#c8372d" strokeWidth="3.5" />
          <circle cx={a.cx} cy={a.neck + 14} r="8" fill="#e3b45a" stroke={INK} strokeWidth="2" />
          <text x={a.cx} y={a.neck + 17.5} textAnchor="middle" fontSize="9" fontWeight="800" fill="#7a1f18" fontFamily="'Shippori Mincho', serif">
            合
          </text>
        </g>
      );
    default:
      return null;
  }
}

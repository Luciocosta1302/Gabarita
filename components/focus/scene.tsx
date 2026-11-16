import type { SceneId, TimeOfDay } from "@/lib/focus/scenes";

/**
 * Cenário lo-fi desenhado em SVG (arte própria). Muda com o horário do dia e com o cenário
 * escolhido; chuva e vapor são animações leves (desligadas com "reduzir movimento").
 */

const SKY: Record<TimeOfDay, [string, string]> = {
  madrugada: ["#15112a", "#2f2552"],
  amanhecer: ["#f3c3a4", "#b9a3d6"],
  dia: ["#a9d3ea", "#f1e3d3"],
  entardecer: ["#f09a72", "#8e4f86"],
  noite: ["#1d1838", "#4b3463"],
};

const STARS = [
  [60, 40], [130, 75], [210, 30], [300, 60], [380, 25], [450, 70], [520, 35], [600, 55], [690, 30], [740, 80], [170, 110], [560, 100],
];

function Sky({ tod, forceNight, uid }: { tod: TimeOfDay; forceNight?: boolean; uid: string }) {
  const t = forceNight ? "noite" : tod;
  const [top, bottom] = SKY[t];
  const dark = t === "noite" || t === "madrugada";
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill={`url(#${uid}-sky)`} />
      {dark &&
        STARS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff8e7" className="scene-twinkle" style={{ animationDelay: `${(i % 5) * 0.7}s` }} />
        ))}
      {dark ? (
        <g>
          <circle cx="640" cy="80" r="26" fill="#fdf3d2" />
          <circle cx="652" cy="72" r="24" fill={top} opacity="0.9" />
        </g>
      ) : (
        <circle cx={t === "entardecer" ? 600 : t === "amanhecer" ? 160 : 620} cy={t === "dia" ? 70 : 190} r="34" fill={t === "dia" ? "#fff4cf" : "#ffd29a"} opacity="0.95" />
      )}
      {/* montanha nevada ao fundo */}
      <path d="M170 330 L355 168 L405 168 L590 330 Z" fill={dark ? "#3b2f55" : "#8b7fa8"} opacity="0.85" />
      <path
        d="M320 199 L355 168 L405 168 L440 199 L426 206 L412 196 L397 209 L381 197 L366 209 L350 197 L334 207 Z"
        fill="#f7f1f6"
        opacity={dark ? 0.55 : 0.95}
      />
      {/* cidade */}
      <g fill={dark ? "#251d3b" : "#5f5277"}>
        {[[0, 300, 70, 150], [60, 270, 50, 180], [110, 310, 80, 140], [190, 285, 45, 165], [240, 320, 90, 130], [520, 295, 60, 155], [575, 265, 55, 185], [630, 305, 80, 145], [705, 280, 95, 170]].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} />
        ))}
      </g>
      {dark && (
        <g fill="#ffd98a" opacity="0.85">
          {[[15, 320], [35, 345], [75, 290], [90, 330], [130, 335], [205, 300], [210, 330], [265, 340], [540, 315], [590, 285], [600, 320], [650, 325], [720, 300], [760, 330]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="7" height="9" />
          ))}
        </g>
      )}
    </g>
  );
}

function Rain() {
  return (
    <g className="scene-rain" stroke="#dfe9ff" strokeWidth="1.2" opacity="0.55">
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={(i * 53) % 800} y1={(i * 37) % 450} x2={((i * 53) % 800) - 6} y2={((i * 37) % 450) + 18} />
      ))}
    </g>
  );
}

function Steam({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#fffaf2" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round">
      <path className="scene-steam" d={`M${x} ${y} q-6 -10 0 -20 q6 -10 0 -20`} />
      <path className="scene-steam" style={{ animationDelay: "1.2s" }} d={`M${x + 10} ${y} q-6 -10 0 -20 q6 -10 0 -20`} />
    </g>
  );
}

function Mug({ x, y, color = "#f3e9df" }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width="26" height="24" rx="4" fill={color} />
      <path d={`M${x + 26} ${y + 5} q10 0 10 8 q0 8 -10 8`} stroke={color} strokeWidth="4" fill="none" />
      <Steam x={x + 8} y={y - 4} />
    </g>
  );
}

function Cat({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#2b2033" className="scene-breathe" style={{ transformOrigin: `${x + 30}px ${y + 20}px` }}>
      <ellipse cx={x + 30} cy={y + 18} rx="30" ry="14" />
      <circle cx={x + 58} cy={y + 8} r="11" />
      <path d={`M${x + 52} ${y} l3 -9 l5 7 Z M${x + 62} ${y - 1} l4 -8 l3 9 Z`} />
      <path d={`M${x} ${y + 20} q-18 -4 -14 -18`} stroke="#2b2033" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** Moldura da janela com o céu dentro; `children` é o interior do cômodo por cima. */
function Room({ wall, tod, forceNight, rain, uid, children }: { wall: string; tod: TimeOfDay; forceNight?: boolean; rain?: boolean; uid: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 800 450" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Cenário de estudo">
      <defs>
        <clipPath id={`${uid}-window`}>
          <rect x="150" y="40" width="500" height="290" rx="6" />
        </clipPath>
        <radialGradient id={`${uid}-lamp`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill={wall} />
      <g clipPath={`url(#${uid}-window)`}>
        <Sky tod={tod} forceNight={forceNight} uid={uid} />
        {rain && <Rain />}
      </g>
      <rect x="150" y="40" width="500" height="290" rx="6" fill="none" stroke="#3a2a32" strokeWidth="10" />
      <line x1="400" y1="40" x2="400" y2="330" stroke="#3a2a32" strokeWidth="6" />
      <line x1="150" y1="185" x2="650" y2="185" stroke="#3a2a32" strokeWidth="4" />
      {children}
    </svg>
  );
}

export function Scene({ scene, tod, raining, uid = "scene" }: { scene: SceneId; tod: TimeOfDay; raining: boolean; uid?: string }) {
  const dark = tod === "noite" || tod === "madrugada";
  switch (scene) {
    case "kyoto":
      return (
        <Room wall={dark ? "#3b2a2e" : "#6e4b44"} tod={tod} rain={raining} uid={uid}>
          {/* estantes de livros dos dois lados */}
          {[0, 660].map((x) => (
            <g key={x}>
              <rect x={x} y="0" width="140" height="450" fill="#4a3029" />
              {[40, 130, 220, 310].map((y) => (
                <g key={y}>
                  <rect x={x + 8} y={y + 70} width="124" height="6" fill="#2e1d19" />
                  {Array.from({ length: 9 }, (_, i) => (
                    <rect key={i} x={x + 12 + i * 13} y={y + 22 + (i % 3) * 4} width="10" height={48 - (i % 3) * 4} fill={["#c96f6f", "#e2b77a", "#7f9a7a", "#8c7aa8", "#d99a8e"][(i + y) % 5]} />
                  ))}
                </g>
              ))}
            </g>
          ))}
          {/* pagode lá fora */}
          <g fill={dark ? "#1b1426" : "#4a3a52"}>
            <rect x="505" y="215" width="40" height="115" />
            {[205, 235, 265].map((y, i) => (
              <path key={y} d={`M${490 - i * 4} ${y + 12} L525 ${y - 6} L${560 + i * 4} ${y + 12} Z`} />
            ))}
          </g>
          {/* lanterna de papel */}
          <line x1="250" y1="0" x2="250" y2="70" stroke="#3a2a32" strokeWidth="2" />
          <ellipse cx="250" cy="95" rx="22" ry="28" fill="#f2a65a" className="scene-glow" />
          <rect x="140" y="360" width="520" height="90" fill="#5a3b33" />
          <Mug x={420} y={330} />
          <rect x="250" y="338" width="110" height="16" rx="2" fill="#efe3cf" />
        </Room>
      );
    case "toquio":
      return (
        <Room wall={dark ? "#22202e" : "#3d3a4f"} tod={tod} rain uid={uid}>
          {/* letreiros de néon */}
          <g clipPath={`url(#${uid}-window)`}>
            <rect x="200" y="270" width="16" height="44" rx="3" fill="#ff7eb6" opacity="0.8" className="scene-glow" />
            <rect x="590" y="262" width="40" height="14" rx="3" fill="#7fe3ff" opacity="0.7" className="scene-glow" />
          </g>
          {/* gotas no vidro */}
          {[[220, 90], [300, 150], [470, 110], [560, 210], [350, 260], [610, 80]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="3" ry="5" fill="#e8f1ff" opacity="0.6" />
          ))}
          <rect x="0" y="360" width="800" height="90" fill="#2c2433" />
          <circle cx="160" cy="300" r="120" fill={`url(#${uid}-lamp)`} />
          <path d="M120 360 L150 280 L190 280 L210 360 Z" fill="#4d3b55" />
          <ellipse cx="170" cy="280" rx="26" ry="8" fill="#ffd98a" className="scene-glow" />
          <Cat x={520} y={322} />
          <Mug x={330} y={334} color="#c9b8e8" />
        </Room>
      );
    case "cafe":
      return (
        <Room wall="#3a2620" tod={tod} forceNight rain={raining} uid={uid}>
          {/* luzinhas */}
          <path d="M0 30 Q200 70 400 30 T800 30" stroke="#5a4036" strokeWidth="2" fill="none" />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={30 + i * 56} cy={30 + Math.sin(i) * 14 + 20} r="5" fill="#ffd27d" className="scene-glow" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          {/* luminárias */}
          {[260, 540].map((x) => (
            <g key={x}>
              <line x1={x} y1="0" x2={x} y2="110" stroke="#2a1b16" strokeWidth="2" />
              <path d={`M${x - 26} 135 L${x} 110 L${x + 26} 135 Z`} fill="#c97b4a" />
              <circle cx={x} cy="180" r="90" fill={`url(#${uid}-lamp)`} />
            </g>
          ))}
          <rect x="0" y="350" width="800" height="100" fill="#6b4532" />
          <rect x="0" y="345" width="800" height="10" fill="#8a5a41" />
          <Mug x={300} y={322} />
          <Mug x={470} y={322} color="#e7c3a8" />
          <rect x="380" y="330" width="40" height="18" rx="3" fill="#f2d7b0" />
        </Room>
      );
    default:
      return (
        <Room wall={dark ? "#3e2c3a" : "#7a5a66"} tod={tod} rain={raining} uid={uid}>
          {/* abajur e mesa */}
          <circle cx="620" cy="280" r="140" fill={`url(#${uid}-lamp)`} opacity={dark ? 1 : 0.5} />
          <rect x="0" y="360" width="800" height="90" fill="#5b3f3a" />
          <path d="M590 360 L605 300 L640 300 L655 360 Z" fill="#3a2a32" />
          <path d="M585 300 L610 250 L640 250 L665 300 Z" fill="#e8b878" className={dark ? "scene-glow" : undefined} />
          {/* livros e planta */}
          <rect x="120" y="318" width="90" height="14" fill="#c96f6f" />
          <rect x="125" y="304" width="82" height="14" fill="#7f9a7a" />
          <rect x="130" y="290" width="74" height="14" fill="#8c7aa8" />
          <rect x="60" y="320" width="34" height="40" rx="4" fill="#b07a5a" />
          <path d="M77 320 q-20 -30 -6 -55 M77 320 q5 -40 22 -50 M77 320 q-2 -35 -24 -30" stroke="#6f9a6a" strokeWidth="6" fill="none" strokeLinecap="round" />
          <Mug x={470} y={334} />
          <Cat x={250} y={326} />
        </Room>
      );
  }
}

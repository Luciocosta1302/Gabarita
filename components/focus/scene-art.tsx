import Image from "next/image";

import type { SceneId, TimeOfDay } from "@/lib/focus/scenes";

/**
 * Cenários ilustrados do Espaço de estudos (imagens em /public/cenarios, feitas para o Gabarita).
 * Cada cenário tem uma ilustração; o horário do dia muda a luz com um filtro de cor por cima
 * (quarto e Kyoto são de dia; Tóquio e a cafeteria, de noite). A chuva é animada por cima.
 */

/** O "horário" natural de cada ilustração. */
const BASE: Record<SceneId, "dia" | "noite"> = { quarto: "dia", kyoto: "dia", toquio: "noite", cafe: "noite" };

type Tint = { color: string; opacity: number; blend: "multiply" | "screen" | "soft-light" };
const TINTS: Record<"dia" | "noite", Partial<Record<TimeOfDay, Tint>>> = {
  dia: {
    madrugada: { color: "#0e1430", opacity: 0.62, blend: "multiply" },
    amanhecer: { color: "#f4a67c", opacity: 0.28, blend: "soft-light" },
    entardecer: { color: "#e07a3e", opacity: 0.3, blend: "multiply" },
    noite: { color: "#1a2350", opacity: 0.55, blend: "multiply" },
  },
  noite: {
    madrugada: { color: "#0b1022", opacity: 0.3, blend: "multiply" },
    amanhecer: { color: "#f6c3a0", opacity: 0.16, blend: "screen" },
    dia: { color: "#fff6e8", opacity: 0.14, blend: "screen" },
    entardecer: { color: "#e88a4a", opacity: 0.14, blend: "screen" },
  },
};

export function SceneArt({ scene, tod, raining, label }: { scene: SceneId; tod: TimeOfDay; raining: boolean; label: string }) {
  const tint = TINTS[BASE[scene]][tod];
  const lampOn = BASE[scene] === "dia" && (tod === "noite" || tod === "madrugada");
  return (
    <div className="absolute inset-0">
      <Image src={`/cenarios/${scene}.webp`} alt={label} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
      {tint && (
        <div aria-hidden className="absolute inset-0 transition-opacity duration-1000" style={{ backgroundColor: tint.color, opacity: tint.opacity, mixBlendMode: tint.blend }} />
      )}
      {/* à noite, a luminária da escrivaninha continua acesa */}
      {lampOn && (
        <div
          aria-hidden
          className="scene-glow absolute inset-0"
          style={{ background: "radial-gradient(circle at 18% 62%, rgb(255 205 130 / 0.45), transparent 32%)", mixBlendMode: "screen" }}
        />
      )}
      {raining && (
        <svg aria-hidden viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <g className="scene-rain" stroke="#dfe9ff" strokeWidth="1.2" opacity="0.5">
            {Array.from({ length: 48 }, (_, i) => (
              <line key={i} x1={(i * 53) % 800} y1={(i * 37) % 450} x2={((i * 53) % 800) - 6} y2={((i * 37) % 450) + 18} />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}

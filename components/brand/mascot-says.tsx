import { cn } from "@/lib/utils";

import { Character, CHARACTERS, type CharacterPose } from "./character";
import type { DarumaMood } from "./daruma";

/** Um personagem da turma falando com o aluno (balão com contorno de tinta e o nome, como nas histórias do Duolingo). */
export function MascotSays({
  pose,
  mood,
  eyes,
  children,
  className,
  size = "md",
}: {
  /** quem fala; sem `pose`, fala o Daru (compatível com o uso antigo) */
  pose?: CharacterPose;
  mood?: DarumaMood;
  eyes?: "um" | "dois";
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  const p: CharacterPose = pose ?? { who: "daru", mood: mood ?? "feliz", eyes };
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <Character pose={p} className={cn("shrink-0", size === "sm" ? "w-14" : "w-20 md:w-24")} />
      <div className="relative mb-4 rounded-2xl border-2 border-ink bg-card px-4 py-3 text-sm leading-snug font-medium shadow-[0_3px_0_var(--ink)]">
        {/* rabinho do balão */}
        <span aria-hidden className="absolute -left-[9px] bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-ink bg-card" />
        <span className="text-shu relative block text-[11px] font-bold tracking-[0.14em] uppercase">{CHARACTERS[p.who].name}</span>
        <span className="relative">{children}</span>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

import { Daruma, type DarumaMood } from "./daruma";

/** O Daruma falando com o aluno (balão de fala com contorno de tinta), como o mascote do Duolingo. */
export function MascotSays({
  mood = "feliz",
  eyes,
  children,
  className,
  size = "md",
}: {
  mood?: DarumaMood;
  eyes?: "um" | "dois";
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex items-end gap-3", className)}>
      <Daruma mood={mood} eyes={eyes} className={cn("shrink-0", size === "sm" ? "w-14" : "w-20 md:w-24")} />
      <div className="relative mb-4 rounded-2xl border-2 border-ink bg-card px-4 py-3 text-sm leading-snug font-medium shadow-[0_3px_0_var(--ink)]">
        {/* rabinho do balão */}
        <span aria-hidden className="absolute -left-[9px] bottom-4 size-4 rotate-45 border-b-2 border-l-2 border-ink bg-card" />
        <span className="relative">{children}</span>
      </div>
    </div>
  );
}

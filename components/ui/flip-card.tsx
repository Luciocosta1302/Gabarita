"use client";

import { cn } from "@/lib/utils";

/**
 * Cartão que vira em 3D (ideia do Flip Card do Animata, MIT; feito em CSS puro).
 * As duas faces ficam na mesma célula do grid, então a altura acompanha o maior conteúdo.
 * A face escondida fica fora da árvore de acessibilidade (não "vaza" a resposta).
 */
export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
  label = "Virar o cartão",
  className,
}: {
  flipped: boolean;
  onFlip?: () => void;
  front: React.ReactNode;
  back: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("perspective-[1200px]", className)}>
      <div
        className={cn(
          "relative grid transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] transform-3d motion-reduce:transition-none",
          flipped && "rotate-y-180",
        )}
      >
        <div className="col-start-1 row-start-1 backface-hidden" aria-hidden={flipped} inert={flipped}>
          {onFlip ? (
            <button type="button" onClick={onFlip} aria-label={label} className="block h-full w-full text-left">
              {front}
            </button>
          ) : (
            front
          )}
        </div>
        <div className="col-start-1 row-start-1 rotate-y-180 backface-hidden" aria-hidden={!flipped} inert={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}

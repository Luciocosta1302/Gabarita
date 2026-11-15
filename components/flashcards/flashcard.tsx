"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Cartão que vira ao clicar. A repetição espaçada (FSRS) entra na Fase 2. */
export function Flashcard({ front, back, chunkId }: { front: string; back: string; chunkId: string | null }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={cn("grid gap-2 rounded-2xl border p-4 text-sm shadow-sm transition-colors", flipped ? "bg-pastel-mint" : "bg-card")}>
      <button type="button" onClick={() => setFlipped(!flipped)} className="grid min-h-20 gap-2 text-left" aria-pressed={flipped}>
        <span className="text-muted-foreground text-xs">{flipped ? "Resposta" : "Pergunta"} · clique para virar</span>
        <span className="text-base">{flipped ? back : front}</span>
      </button>
      {flipped && chunkId && (
        <Link href={`/chunks/${chunkId}`} className="text-primary text-xs underline">
          Ver no material
        </Link>
      )}
    </div>
  );
}

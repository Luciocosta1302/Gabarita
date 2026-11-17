"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FlipCard } from "@/components/ui/flip-card";

/** Frente do cartão: papel, "問" (pergunta). */
export function CardFront({ children, hint = "Toque para virar" }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-card seigaiha-ink grid h-full min-h-40 content-between gap-4 rounded-2xl border-2 border-ink p-5 shadow-[0_4px_0_var(--ink)]">
      <span className="eyebrow flex items-center gap-2">
        <span className="font-display text-shu text-base tracking-normal" lang="ja" title="mon, pergunta">
          問
        </span>
        Pergunta
      </span>
      <span className="font-display text-lg leading-snug font-extrabold">{children}</span>
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <RotateCcw aria-hidden className="size-3.5" /> {hint}
      </span>
    </div>
  );
}

/** Verso: índigo, "答" (resposta). */
export function CardBack({ children, footer, testId }: { children: React.ReactNode; footer?: React.ReactNode; testId?: string }) {
  return (
    <div className="bg-ai seigaiha text-washi grid h-full min-h-40 content-between gap-4 rounded-2xl border-2 border-ink p-5 shadow-[0_4px_0_var(--ink)]" data-testid={testId}>
      <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-washi/70 uppercase">
        <span className="font-display text-base tracking-normal text-[#f3c9c3]" lang="ja" title="kotae, resposta">
          答
        </span>
        Resposta
      </span>
      <span className="text-base leading-relaxed font-medium">{children}</span>
      {footer}
    </div>
  );
}

/** Cartão da lista de flashcards da matéria: vira ao tocar. */
export function Flashcard({ front, back, chunkId }: { front: string; back: string; chunkId: string | null }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <FlipCard
      flipped={flipped}
      onFlip={() => setFlipped(true)}
      label={`Virar o cartão: ${front}`}
      front={<CardFront>{front}</CardFront>}
      back={
        <CardBack
          footer={
            <span className="flex items-center justify-between gap-2 text-xs">
              {chunkId ? (
                <Link href={`/chunks/${chunkId}`} className="underline underline-offset-2">
                  Ver no material
                </Link>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setFlipped(false)} className="flex items-center gap-1 underline underline-offset-2">
                <RotateCcw aria-hidden className="size-3.5" /> Desvirar
              </button>
            </span>
          }
        >
          {back}
        </CardBack>
      }
    />
  );
}

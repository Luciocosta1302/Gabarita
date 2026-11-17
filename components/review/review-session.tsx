"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Mochi } from "@/components/brand/mochi";
import { Hanko } from "@/components/brand/hanko";
import { CardBack, CardFront } from "@/components/flashcards/flashcard";
import { QuestionCard, type PublicQuestion } from "@/components/quiz/question-card";
import { FlipCard } from "@/components/ui/flip-card";
import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { GRADE_LABELS, type ReviewGrade } from "@/lib/srs/grades";

export type ReviewItem =
  | { kind: "flashcard"; id: string; subject: string; front: string; back: string; chunkId: string | null }
  | { kind: "question"; id: string; subject: string; question: PublicQuestion };

const GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];
/** Uma cor por nota, para escolher sem precisar ler: errei (vermelho), difícil (caqui), bom (matchá), fácil (índigo). */
const GRADE_COLORS: Record<ReviewGrade, string> = {
  again: "bg-shu text-washi",
  hard: "bg-[#d9a066] text-ink",
  good: "bg-matcha text-washi",
  easy: "bg-ai text-washi",
};

export function ReviewSession({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (i >= items.length) {
    return (
      <div className="bg-card animate-rise grid justify-items-center gap-3 rounded-2xl border-2 border-ink p-6 text-center shadow-[0_4px_0_var(--ink)]" data-testid="review-done">
        <div className="relative">
          <Mochi mood="comemorando" className="w-24" />
          <Hanko className="animate-stamp absolute -right-8 -bottom-1 size-12" rotate={-10} />
        </div>
        <p className="font-display text-2xl font-extrabold">Tudo revisado por hoje</p>
        <p className="text-muted-foreground text-sm">Os itens voltam na data certa para você não esquecer.</p>
        <Button variant="outline" className="justify-self-center" onClick={() => router.refresh()}>
          Atualizar
        </Button>
      </div>
    );
  }

  const item = items[i];
  const next = () => {
    setI(i + 1);
    setRevealed(false);
    setAnswered(false);
  };

  async function grade(g: ReviewGrade) {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/review", { flashcard_id: item.id, grade: g });
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid gap-4" data-testid="review-item" data-kind={item.kind}>
      {/* a pilha: os cartões que ainda faltam aparecem atrás (ideia do Card Stack do Animata) */}
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className="bg-card text-foreground rounded-full border-[1.5px] border-ink/70 px-2.5 py-0.5 font-bold">{item.subject}</span>
        <span>
          {i + 1} de {items.length}
        </span>
      </div>

      {item.kind === "flashcard" ? (
        <>
          <div className="relative">
            {items.length - i > 2 && <span aria-hidden className="bg-card absolute inset-x-6 -bottom-3 h-full rotate-2 rounded-2xl border-2 border-ink/40" />}
            {items.length - i > 1 && <span aria-hidden className="bg-card absolute inset-x-3 -bottom-1.5 h-full -rotate-1 rounded-2xl border-2 border-ink/60" />}
            <FlipCard
              key={item.id}
              className="relative"
              flipped={revealed}
              onFlip={() => setRevealed(true)}
              label={`Virar o cartão: ${item.front}`}
              front={<CardFront hint="Toque para ver a resposta">{item.front}</CardFront>}
              back={
                <CardBack
                  testId={revealed ? "flashcard-back" : undefined}
                  footer={
                    item.chunkId ? (
                      <Link href={`/chunks/${item.chunkId}`} target="_blank" className="text-xs underline underline-offset-2">
                        Ver no material
                      </Link>
                    ) : null
                  }
                >
                  {item.back}
                </CardBack>
              }
            />
          </div>
          {revealed ? (
            <>
              <div className="grid gap-2 pt-2">
                <span className="text-sm font-medium">Como foi lembrar?</span>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <Button key={g} size="sm" disabled={busy} onClick={() => grade(g)} className={GRADE_COLORS[g]}>
                      {GRADE_LABELS[g]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Button className="justify-self-start" onClick={() => setRevealed(true)}>
              Mostrar resposta
            </Button>
          )}
        </>
      ) : (
        <>
          <QuestionCard key={item.id} question={item.question} onAnswered={() => setAnswered(true)} />
          {answered && (
            <Button className="justify-self-end" onClick={next}>
              Próximo →
            </Button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

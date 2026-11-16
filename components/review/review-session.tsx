"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuestionCard, type PublicQuestion } from "@/components/quiz/question-card";
import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { GRADE_LABELS, type ReviewGrade } from "@/lib/srs/grades";

export type ReviewItem =
  | { kind: "flashcard"; id: string; subject: string; front: string; back: string; chunkId: string | null }
  | { kind: "question"; id: string; subject: string; question: PublicQuestion };

const GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

export function ReviewSession({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (i >= items.length) {
    return (
      <div className="bg-pastel-mint animate-rise grid gap-2 rounded-2xl p-6 text-center" data-testid="review-done">
        <p className="font-display text-2xl font-bold">Tudo revisado por hoje 🍵</p>
        <p className="text-sm">Os itens voltam na data certa para você não esquecer.</p>
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
    <div className="bg-card grid gap-4 rounded-2xl border p-5 shadow-sm" data-testid="review-item" data-kind={item.kind}>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span className="bg-pastel-lilac text-foreground rounded-full px-2.5 py-0.5">{item.subject}</span>
        <span>
          {i + 1} de {items.length}
        </span>
      </div>

      {item.kind === "flashcard" ? (
        <>
          <p className="text-lg font-medium">{item.front}</p>
          {revealed ? (
            <>
              <div className="bg-pastel-mint rounded-xl p-4" data-testid="flashcard-back">
                {item.back}
                {item.chunkId && (
                  <Link href={`/chunks/${item.chunkId}`} target="_blank" className="text-primary mt-2 block text-xs underline">
                    Ver no material
                  </Link>
                )}
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">Como foi lembrar?</span>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <Button key={g} size="sm" variant={g === "again" ? "outline" : "secondary"} disabled={busy} onClick={() => grade(g)}>
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

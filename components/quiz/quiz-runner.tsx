"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Celebration } from "@/components/feedback/celebration";
import { SoundToggle } from "@/components/feedback/sound-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { QuestionCard, type PublicQuestion } from "./question-card";

/** Passa pelas questões ainda não respondidas do quiz, uma por vez; no fim, comemora. */
export function QuizRunner({
  quizId,
  questions,
  offset,
  total,
}: {
  quizId: string;
  questions: PublicQuestion[];
  /** quantas já tinham sido respondidas antes (para retomar de onde parou) */
  offset: number;
  total: number;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[i];
  const last = i === questions.length - 1;
  const progress = ((offset + i + (answered ? 1 : 0)) / total) * 100;

  const next = useCallback(() => {
    if (last) {
      setDone(true);
      return;
    }
    setAnswered(false);
    setI((n) => n + 1);
  }, [last]);

  // Enter avança depois de responder
  useEffect(() => {
    if (!answered || done) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "Enter" && !(t && ["BUTTON", "A", "TEXTAREA", "INPUT"].includes(t.tagName))) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, done, next]);

  return (
    <div className="bg-card grid gap-4 rounded-2xl border-2 border-ink p-5 shadow-[0_4px_0_var(--ink)]">
      <div className="flex items-center gap-3">
        <div
          className="h-3.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-muted"
          role="progressbar"
          aria-label="Progresso do quiz"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="bg-primary h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.9,.3,1.2)]" style={{ width: `${progress}%` }} />
        </div>
        {combo >= 2 && (
          <span key={combo} className="animate-pop bg-kin text-ink rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap" data-testid="combo">
            <span lang="ja" title="ren, seguidas">
              連
            </span>{" "}
            {combo} seguidas
          </span>
        )}
        <SoundToggle />
      </div>
      <QuestionCard
        key={q.id}
        question={q}
        quizId={quizId}
        combo={combo}
        header={
          <span className="text-muted-foreground text-sm">
            Questão {offset + i + 1} de {total}
          </span>
        }
        onAnswered={(r) => {
          setAnswered(true);
          setCombo((c) => (r.correct ? c + 1 : 0));
          if (r.correct) setCorrect((c) => c + 1);
        }}
      />
      {answered && (
        <Button onClick={next} size="lg" className={cn("animate-slide-up w-full sm:w-auto sm:justify-self-end")}>
          {last ? "Ver resultado" : "Próxima →"}
        </Button>
      )}
      {done && (
        <Celebration
          title={correct === questions.length ? "Gabaritou!" : correct >= questions.length / 2 ? "Muito bem!" : "Etapa concluída!"}
          subtitle={
            correct === questions.length
              ? "Todas certas. O Daru pintou o segundo olho."
              : "Os erros já foram para o caderno, com uma questão parecida para tentar de novo."
          }
          stats={[
            { label: "Acertos", value: correct, suffix: `/${questions.length}` },
            { label: "XP ganho", value: correct * 5 + (questions.length - correct) * 2 },
          ]}
          continueLabel="Ver resultado"
          onContinue={() => router.refresh()}
        />
      )}
    </div>
  );
}

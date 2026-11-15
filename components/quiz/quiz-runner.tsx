"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { QuestionCard, type PublicQuestion } from "./question-card";

/** Passa pelas questões ainda não respondidas do quiz, uma por vez. */
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
  const q = questions[i];
  const last = i === questions.length - 1;

  function next() {
    if (last) {
      router.refresh();
      return;
    }
    setAnswered(false);
    setI(i + 1);
  }

  return (
    <div className="bg-card grid gap-4 rounded-2xl border p-5 shadow-sm">
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${((offset + i + (answered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>
      <QuestionCard
        key={q.id}
        question={q}
        quizId={quizId}
        header={
          <span className="text-muted-foreground text-sm">
            Questão {offset + i + 1} de {total}
          </span>
        }
        onAnswered={() => setAnswered(true)}
      />
      {answered && (
        <Button onClick={next} className="justify-self-end">
          {last ? "Ver resultado" : "Próxima →"}
        </Button>
      )}
    </div>
  );
}

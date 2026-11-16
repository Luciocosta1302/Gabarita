"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { AttemptResult } from "@/app/api/attempts/route";
import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { isTrueFalse } from "@/lib/exam-styles";
import { CONFIDENCE_LABELS, CONFIDENCE_LEVELS, type Confidence } from "@/lib/quiz/confidence";
import { indexToLetter, letterToIndex } from "@/lib/quiz/options";
import { cn } from "@/lib/utils";

export type PublicQuestion = { id: string; stem: string; options: string[] };

/**
 * Uma questão: escolhe a alternativa, marca a confiança (D7) e responde.
 * O gabarito só chega do servidor depois de responder.
 */
export function QuestionCard({
  question,
  quizId,
  header,
  onAnswered,
  submit,
}: {
  question: PublicQuestion;
  quizId?: string;
  header?: React.ReactNode;
  onAnswered?: (r: AttemptResult) => void;
  /** envio próprio (ex.: tutor da trilha); padrão = /api/attempts */
  submit?: (body: { question_id: string; answer: string; confidence: Confidence; time_ms: number }) => Promise<AttemptResult>;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());

  async function answer() {
    if (chosen == null || !confidence) return;
    setBusy(true);
    setError(null);
    try {
      const body = { question_id: question.id, answer: indexToLetter(chosen), confidence, time_ms: Date.now() - started.current };
      const r = submit ? await submit(body) : await postJSON<AttemptResult>("/api/attempts", { ...body, quiz_id: quizId });
      setResult(r);
      onAnswered?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  const correctIndex = result ? letterToIndex(result.answer) : null;
  const tf = isTrueFalse(question.options);

  return (
    <div className="grid gap-4" data-testid="question-card">
      {header}
      <p className="text-lg leading-relaxed font-medium">{question.stem}</p>

      <div role="radiogroup" aria-label="Alternativas" className="grid gap-2">
        {question.options.map((opt, i) => {
          const isChosen = chosen === i;
          const state = result ? (i === correctIndex ? "correct" : isChosen ? "wrong" : "idle") : isChosen ? "chosen" : "idle";
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={!!result}
              onClick={() => setChosen(i)}
              className={cn(
                "flex gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                state === "idle" && "bg-card hover:bg-accent",
                state === "chosen" && "border-primary bg-accent ring-primary/30 ring-2",
                state === "correct" && "border-success bg-pastel-mint",
                state === "wrong" && "border-destructive bg-destructive/10",
              )}
            >
              {!tf && <span className="font-semibold">{indexToLetter(i)})</span>}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {!result && (
        <>
          <div className="grid gap-2">
            <span className="text-sm font-medium" id={`conf-${question.id}`}>
              Antes de responder: quanta certeza você tem?
            </span>
            <div role="radiogroup" aria-labelledby={`conf-${question.id}`} className="flex flex-wrap gap-2">
              {CONFIDENCE_LEVELS.map((c) => (
                <Button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={confidence === c}
                  size="sm"
                  variant={confidence === c ? "default" : "outline"}
                  onClick={() => setConfidence(c)}
                >
                  {CONFIDENCE_LABELS[c]}
                </Button>
              ))}
            </div>
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button onClick={answer} disabled={chosen == null || !confidence || busy} className="justify-self-start">
            {busy ? "Enviando..." : "Responder"}
          </Button>
        </>
      )}

      {result && (
        <div
          role="status"
          data-testid="answer-feedback"
          className={cn("grid gap-2 rounded-xl p-4 text-sm", result.correct ? "bg-pastel-mint" : "bg-pastel-rose")}
        >
          <p className="font-semibold">
            {result.correct
              ? "✓ Acertou!"
              : `✗ Errou. A resposta certa é ${tf ? question.options[correctIndex!] : result.answer}.`}
          </p>
          {result.explanation && <p>{result.explanation}</p>}
          {result.chunk_id && (
            <Link href={`/chunks/${result.chunk_id}?q=${question.id}`} target="_blank" className="text-primary font-medium underline">
              Ver no material{result.source_page != null ? ` (p. ${result.source_page})` : ""}
            </Link>
          )}
          {!result.correct && (
            <p className="text-foreground/75">
              Foi para o <Link href="/errors" className="underline">caderno de erros</Link>, com uma questão parecida para
              tentar de novo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

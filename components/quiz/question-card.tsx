"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { AttemptResult } from "@/app/api/attempts/route";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/api/client";
import { isTrueFalse } from "@/lib/exam-styles";
import { CONFIDENCE_LABELS, CONFIDENCE_LEVELS, type Confidence } from "@/lib/quiz/confidence";
import { indexToLetter, letterToIndex } from "@/lib/quiz/options";
import { cn } from "@/lib/utils";

import { Fuku } from "@/components/brand/fuku";
import { Mochi } from "@/components/brand/mochi";
import { Hanko } from "@/components/brand/hanko";

import { XpFloat } from "@/components/feedback/xp-float";
import { petals } from "@/lib/feedback/celebrate";
import { play } from "@/lib/feedback/sound";

import { OpenFeedback } from "./open-feedback";

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
  combo = 0,
}: {
  question: PublicQuestion;
  quizId?: string;
  header?: React.ReactNode;
  onAnswered?: (r: AttemptResult) => void;
  /** envio próprio (ex.: tutor da trilha); padrão = /api/attempts */
  submit?: (body: { question_id: string; answer: string; confidence: Confidence; time_ms: number }) => Promise<AttemptResult>;
  /** acertos seguidos antes desta questão (o som do acerto sobe de tom) */
  combo?: number;
}) {
  const open = question.options.length === 0; // discursiva (D10)
  const [chosen, setChosen] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  async function answer() {
    if ((open ? !text.trim() : chosen == null) || !confidence) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        question_id: question.id,
        answer: open ? text.trim() : indexToLetter(chosen!),
        confidence,
        time_ms: Date.now() - started.current,
      };
      const r = submit ? await submit(body) : await postJSON<AttemptResult>("/api/attempts", { ...body, quiz_id: quizId });
      setResult(r);
      if (!r.feedback) {
        play(r.correct ? "correct" : "wrong", { combo });
        if (r.correct) setTimeout(() => play("stamp"), 260);
      }
      onAnswered?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  // pétalas saindo do painel de acerto
  useEffect(() => {
    if (!result || result.feedback) return;
    if (result.correct) petals(feedbackRef.current, 12);
    // no celular a explicação e o "Próxima" ficam abaixo da dobra: traz para a tela
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => feedbackRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }), 250);
    return () => clearTimeout(t);
  }, [result]);

  // atalhos: 1–5 ou A–E escolhem a alternativa; Enter responde
  const answerRef = useRef(answer);
  answerRef.current = answer;
  useEffect(() => {
    if (result || open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const idx = /^[1-9]$/.test(k) ? Number(k) - 1 : /^[a-e]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
      if (idx >= 0 && idx < question.options.length) {
        setChosen(idx);
        play("tap");
      } else if (k === "enter" && !(t && t.tagName === "BUTTON")) {
        answerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, open, question.options.length]);

  const correctIndex = result ? letterToIndex(result.answer) : null;
  const tf = isTrueFalse(question.options);

  return (
    <div className="grid gap-4" data-testid="question-card">
      {header}
      <p className="text-lg leading-relaxed font-medium">{question.stem}</p>

      {open && (
        <Textarea
          aria-label="Sua resposta"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!result || busy}
          rows={6}
          maxLength={5000}
          placeholder="Escreva sua resposta com suas palavras (um parágrafo)..."
        />
      )}
      <div role="radiogroup" aria-label="Alternativas" className={cn("grid gap-2", open && "hidden")}>
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
              onClick={() => {
                setChosen(i);
                play("tap");
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl border-2 p-2.5 text-left text-sm font-medium transition-[transform,box-shadow,background-color] duration-75",
                state === "wrong" && "animate-shake",
                state === "correct" && "animate-pop",
                state === "idle" && "bg-card border-ink/25 shadow-[0_3px_0_rgb(31_26_23/0.18)] hover:border-ink/60 active:translate-y-[2px] active:shadow-none",
                state === "chosen" && "border-shu bg-[#fbe9e4] shadow-[0_3px_0_var(--shu)]",
                state === "correct" && "border-matcha bg-pastel-mint shadow-[0_3px_0_var(--matcha)]",
                state === "wrong" && "border-shu bg-[#f6dcd7] shadow-[0_3px_0_var(--shu)]",
              )}
            >
              {!tf && (
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg border-2 text-xs font-bold",
                    state === "idle" && "border-ink/25 text-ink/70",
                    state === "chosen" && "border-shu bg-shu text-washi",
                    state === "correct" && "border-matcha bg-matcha text-washi",
                    state === "wrong" && "border-shu bg-shu text-washi",
                  )}
                >
                  {indexToLetter(i)}
                </span>
              )}
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
                  onClick={() => {
                    setConfidence(c);
                    play("tap");
                  }}
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
          <Button onClick={answer} disabled={(open ? !text.trim() : chosen == null) || !confidence || busy} className="justify-self-start">
            {busy ? (open ? "Corrigindo..." : "Enviando...") : "Responder"}
          </Button>
        </>
      )}

      {result?.feedback && <OpenFeedback result={result} questionId={question.id} />}
      {result && !result.feedback && (
        <div className="relative">
        <XpFloat amount={result.correct ? 5 : 2} className="top-2" />
        <div
          ref={feedbackRef}
          role="status"
          data-testid="answer-feedback"
          className={cn(
            "animate-slide-up relative grid gap-2 overflow-hidden rounded-2xl border-2 p-4 text-sm",
            result.correct ? "border-matcha bg-pastel-mint" : "border-shu bg-[#f8e3de]",
          )}
        >
          <div className="flex items-center gap-3">
            {result.correct ? (
              <Mochi mood="comemorando" className="animate-char-pop w-14 shrink-0" title="Mochi comemorando" />
            ) : (
              <Fuku mood="explicando" className="animate-char-pop w-14 shrink-0" title="Fuku explicando" />
            )}
            <p className={cn("font-display text-lg font-extrabold", result.correct ? "text-matcha" : "text-shu")}>
              {result.correct ? "Acertou!" : `Errou. A certa é ${tf ? question.options[correctIndex!] : result.answer}.`}
            </p>
            {result.correct && <Hanko className="animate-stamp ml-auto size-12" rotate={-10} label="carimbo de acerto" />}
          </div>
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
        </div>
      )}
    </div>
  );
}

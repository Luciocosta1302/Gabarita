"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { isTrueFalse } from "@/lib/exam-styles";
import { CONFIDENCE_LABELS, CONFIDENCE_LEVELS, type Confidence } from "@/lib/quiz/confidence";
import { indexToLetter } from "@/lib/quiz/options";
import { cn } from "@/lib/utils";

import type { PublicQuestion } from "./question-card";

type Answer = { answer: string | null; confidence: Confidence | null; time_ms: number };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

/** D16 — simulado cronometrado: navega entre as questões, entrega no fim (ou quando o tempo acaba). */
export function SimuladoRunner({
  quizId,
  questions,
  startedAt: initialStartedAt,
  timeLimitS,
  room = false,
}: {
  quizId: string;
  questions: PublicQuestion[];
  startedAt: string | null;
  timeLimitS: number;
  /** simulado da turma (D14): cronômetro local e entrega em /api/rooms */
  room?: boolean;
}) {
  const router = useRouter();
  const storageKey = `simulado:${quizId}`;
  const [startedAt, setStartedAt] = useState(initialStartedAt);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [current, setCurrent] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());
  const submitted = useRef(false);

  // recupera respostas salvas neste navegador (recarregar a página não perde nada)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setAnswers(JSON.parse(saved));
      const roomStart = room ? localStorage.getItem(`${storageKey}:inicio`) : null;
      if (roomStart) setStartedAt(roomStart);
    } catch {
      /* sem armazenamento: segue sem recuperar */
    }
  }, [room, storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* idem */
    }
  }, [answers, storageKey]);

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const get = (id: string): Answer => answers[id] ?? { answer: null, confidence: null, time_ms: 0 };

  /** soma o tempo gasto na questão atual antes de trocar/entregar */
  const flushTime = useCallback(() => {
    const q = questions[current];
    if (!q) return answers;
    const spent = Date.now() - shownAt.current;
    shownAt.current = Date.now();
    const prev = answers[q.id] ?? { answer: null, confidence: null, time_ms: 0 };
    const next = { ...answers, [q.id]: { ...prev, time_ms: prev.time_ms + spent } };
    setAnswers(next);
    return next;
  }, [answers, current, questions]);

  const submit = useCallback(
    async (final: Record<string, Answer>) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setError(null);
      try {
        if (room) {
          await postJSON("/api/rooms", {
            action: "submit",
            room_quiz_id: quizId,
            answers: Object.fromEntries(questions.map((q) => [q.id, final[q.id]?.answer ?? null])),
            time_ms: Math.round(questions.reduce((s, q) => s + (final[q.id]?.time_ms ?? 0), 0)),
          });
        } else {
          await postJSON("/api/simulado/finish", {
            quiz_id: quizId,
            answers: questions.map((q) => {
              const a = final[q.id] ?? { answer: null, confidence: null, time_ms: 0 };
              return { question_id: q.id, answer: a.answer, confidence: a.confidence, time_ms: Math.round(a.time_ms) };
            }),
          });
        }
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* idem */
        }
        router.refresh();
      } catch (e) {
        submitted.current = false;
        setError(e instanceof Error ? e.message : "Falha ao entregar. Tente de novo.");
        setBusy(false);
      }
    },
    [questions, quizId, room, router, storageKey],
  );

  const remaining = startedAt ? Date.parse(startedAt) + timeLimitS * 1000 - now : timeLimitS * 1000;
  useEffect(() => {
    if (startedAt && remaining <= 0 && !submitted.current) submit(flushTime());
  }, [remaining, startedAt, submit, flushTime]);

  if (!startedAt) {
    return (
      <div className="bg-card grid gap-4 rounded-2xl border p-6 shadow-sm" data-testid="simulado-start">
        <p className="text-lg">
          {questions.length} questões · <strong>{fmt(timeLimitS * 1000)}</strong> de prova
        </p>
        <p className="text-muted-foreground text-sm">
          O tempo começa quando você clicar e não para se sair da página. Você só vê o gabarito depois de entregar. Quando o
          tempo acabar, o simulado é entregue sozinho.
        </p>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          className="justify-self-start"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const started = room
                ? new Date().toISOString()
                : (await postJSON<{ started_at: string }>("/api/simulado/start", { quiz_id: quizId })).started_at;
              if (room) {
                try {
                  localStorage.setItem(`${storageKey}:inicio`, started);
                } catch {
                  /* sem armazenamento */
                }
              }
              shownAt.current = Date.now();
              setNow(Date.now());
              setStartedAt(started);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Falha ao começar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Começar simulado
        </Button>
      </div>
    );
  }

  const q = questions[current];
  const a = get(q.id);
  const tf = isTrueFalse(q.options);
  const answeredCount = questions.filter((x) => answers[x.id]?.answer).length;
  const go = (i: number) => {
    flushTime();
    setCurrent(i);
  };
  const set = (patch: Partial<Answer>) => setAnswers((prev) => ({ ...prev, [q.id]: { ...get(q.id), ...prev[q.id], ...patch } }));

  return (
    <div className="grid gap-4">
      <div className="bg-sidebar text-sidebar-foreground sticky top-2 z-10 flex items-center justify-between rounded-2xl px-4 py-3 shadow">
        <span className="text-sm">
          {answeredCount}/{questions.length} respondidas
        </span>
        <span data-testid="simulado-timer" className={cn("font-mono text-xl", remaining < 5 * 60_000 && "text-[oklch(0.8_0.15_25)]")}>
          ⏱ {fmt(remaining)}
        </span>
      </div>

      <nav aria-label="Questões" className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => go(i)}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "size-8 rounded-lg border text-xs",
              answers[x.id]?.answer ? "bg-pastel-lilac" : "bg-card",
              i === current && "ring-primary ring-2",
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <div className="bg-card grid gap-4 rounded-2xl border p-5 shadow-sm" data-testid="simulado-question">
        <span className="text-muted-foreground text-sm">
          Questão {current + 1} de {questions.length}
        </span>
        <p className="text-lg leading-relaxed font-medium">{q.stem}</p>
        <div role="radiogroup" aria-label="Alternativas" className="grid gap-2">
          {q.options.map((opt, i) => {
            const letter = indexToLetter(i);
            const chosen = a.answer === letter;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => set({ answer: chosen ? null : letter })}
                className={cn(
                  "flex gap-3 rounded-xl border p-3 text-left text-sm",
                  chosen ? "border-primary bg-accent ring-primary/30 ring-2" : "bg-card hover:bg-accent",
                )}
              >
                {!tf && <span className="font-semibold">{letter})</span>}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Confiança:</span>
          {CONFIDENCE_LEVELS.map((c) => (
            <Button key={c} type="button" role="radio" aria-checked={a.confidence === c} size="sm" variant={a.confidence === c ? "default" : "outline"} onClick={() => set({ confidence: c })}>
              {CONFIDENCE_LABELS[c]}
            </Button>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="outline" disabled={current === 0} onClick={() => go(current - 1)}>
            ← Anterior
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => go(current + 1)}>Próxima →</Button>
          ) : (
            <span />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        disabled={busy}
        className="justify-self-end"
        onClick={() => {
          const blank = questions.length - answeredCount;
          if (blank > 0 && !window.confirm(`Ainda há ${blank} em branco. Entregar mesmo assim?`)) return;
          submit(flushTime());
        }}
      >
        {busy ? "Corrigindo..." : "Entregar simulado"}
      </Button>
    </div>
  );
}

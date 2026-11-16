"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { AttemptResult } from "@/app/api/attempts/route";
import { QuestionCard, type PublicQuestion } from "@/components/quiz/question-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/api/client";
import { CITATION_SPLIT, citationNumbers } from "@/lib/text/citations";
import { cn } from "@/lib/utils";

type Citation = { n: number; chunk_id: string; page: number | null };
export type TutorMessage = {
  id: string;
  role: "tutor" | "student";
  kind: "explanation" | "question" | "feedback" | "diagnosis" | "chat" | "done";
  content: Record<string, unknown>;
  question: PublicQuestion | null;
};

function WithCitations({ text, citations = [] }: { text: string; citations?: Citation[] }) {
  const byN = new Map(citations.map((c) => [c.n, c]));
  return (
    <>
      {text.split(CITATION_SPLIT).map((part, i) => {
        const nums = citationNumbers(part);
        if (!nums) return <span key={i}>{part}</span>;
        return (
          <span key={i}>
            {nums.map((n, j) => {
              const c = byN.get(n);
              return c ? (
                <Link key={j} href={`/chunks/${c.chunk_id}`} target="_blank" className="text-primary font-medium underline">
                  [{c.page != null ? `p. ${c.page}` : n}]
                </Link>
              ) : null;
            })}
          </span>
        );
      })}
    </>
  );
}

export function TutorSession({
  stepId,
  messages,
  status,
  nextStepHref,
}: {
  stepId: string;
  messages: TutorMessage[];
  status: string;
  nextStepHref: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function act(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setError(null);
    try {
      const r = await postJSON("/api/tutor", { step_id: stepId, ...body });
      router.refresh();
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "O tutor não conseguiu responder agora.");
      throw e;
    } finally {
      setBusy(null);
    }
  }

  // primeira visita: o tutor prepara a explicação e a primeira questão
  useEffect(() => {
    if (messages.length === 0 && !started.current && status !== "locked") {
      started.current = true;
      act("start", { action: "start" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const last = messages.at(-1);
  // a questão continua aberta mesmo com dúvidas/explicações depois dela, até chegar a correção
  const lastQA = messages.findLast((m) => m.kind === "question" || m.kind === "feedback");
  const openQuestionId = lastQA?.kind === "question" ? lastQA.question?.id : null;
  const done = status === "done";

  return (
    <div className="grid gap-4">
      {messages.length === 0 && (
        <div className="bg-card text-muted-foreground animate-pulse rounded-2xl border p-5 text-sm">O tutor está preparando a explicação...</div>
      )}

      <ol className="grid gap-4" data-testid="tutor-messages">
        {messages.map((m) => {
          const c = m.content as Record<string, never>;
          switch (m.kind) {
            case "explanation":
              return (
                <li key={m.id} data-testid="tutor-explanation" className="bg-card animate-rise grid gap-3 rounded-2xl border p-5 shadow-sm">
                  <span className="text-muted-foreground text-xs font-medium">
                    🧑‍🏫 Tutor {c.simpler ? "· explicando de outro jeito" : ""}
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">
                    <WithCitations text={c.text} citations={c.citations} />
                  </p>
                  {Array.isArray(c.key_points) && (c.key_points as string[]).length > 0 && (
                    <ul className="bg-pastel-lilac/60 list-disc space-y-1 rounded-xl py-3 pr-3 pl-8 text-sm">
                      {(c.key_points as string[]).map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  )}
                  {c.example && <p className="bg-pastel-peach/60 rounded-xl p-3 text-sm">💡 {c.example}</p>}
                </li>
              );
            case "question":
              return (
                <li key={m.id} className="bg-card animate-rise grid gap-2 rounded-2xl border p-5 shadow-sm">
                  <span className="text-muted-foreground text-xs font-medium">✏️ Vamos ver se ficou claro</span>
                  {m.question && m.question.id === openQuestionId && !done ? (
                    <QuestionCard
                      question={m.question}
                      submit={async (body) =>
                        (await act("answer", { action: "answer", ...body, question_id: body.question_id })) as AttemptResult
                      }
                    />
                  ) : (
                    <p className="text-sm">{m.question?.stem ?? "Questão"}</p>
                  )}
                </li>
              );
            case "feedback":
              return (
                <li
                  key={m.id}
                  data-testid="tutor-feedback"
                  className={cn("justify-self-end rounded-2xl px-4 py-2 text-sm", c.correct ? "bg-pastel-mint" : "bg-pastel-rose")}
                >
                  {c.correct ? "✓ Acertei" : `✗ Errei (marquei ${c.answer}; a certa era ${c.right_answer})`}
                </li>
              );
            case "diagnosis":
              return (
                <li key={m.id} data-testid="tutor-diagnosis" className="bg-pastel-rose/70 animate-rise grid gap-1 rounded-2xl p-4 text-sm">
                  <span className="font-semibold">O que aconteceu</span>
                  <p>{c.text}</p>
                </li>
              );
            case "chat":
              return m.role === "student" ? (
                <li key={m.id} className="bg-primary text-primary-foreground max-w-[85%] justify-self-end rounded-2xl px-4 py-2 text-sm">
                  {c.text}
                </li>
              ) : (
                <li key={m.id} className="bg-card max-w-[90%] rounded-2xl border px-4 py-3 text-sm whitespace-pre-wrap">
                  <WithCitations text={c.text} citations={c.citations} />
                </li>
              );
            case "done":
              return (
                <li key={m.id} data-testid="tutor-done" className="bg-pastel-mint animate-rise grid gap-2 rounded-2xl p-5">
                  <span className="font-display text-xl font-bold">Etapa concluída 🌸</span>
                  <p className="text-sm">{c.text}</p>
                  {nextStepHref && (
                    <Button asChild className="justify-self-start">
                      <Link href={nextStepHref}>Ir para a trilha →</Link>
                    </Button>
                  )}
                </li>
              );
          }
        })}
      </ol>
      {busy === "answer" && <div className="text-muted-foreground animate-pulse text-sm">O tutor está analisando sua resposta...</div>}
      <div ref={endRef} />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {!done && messages.length > 0 && (
        <div className="bg-card grid gap-3 rounded-2xl border p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act("again", { action: "again" }).catch(() => {})}>
              {busy === "again" ? "Explicando..." : "Explicar de outro jeito"}
            </Button>
            {!openQuestionId && last?.kind !== "done" && (
              <Button size="sm" disabled={!!busy} data-testid="tutor-continue" onClick={() => act("continue", { action: "continue" }).catch(() => {})}>
                {busy === "continue" ? "Preparando..." : "Próxima questão"}
              </Button>
            )}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) return;
              act("ask", { action: "ask", question })
                .then(() => setQuestion(""))
                .catch(() => {});
            }}
          >
            <Textarea
              aria-label="Pergunte ao tutor"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Ficou alguma dúvida? Pergunte ao tutor..."
              className="min-h-12"
            />
            <Button type="submit" disabled={!!busy || !question.trim()}>
              {busy === "ask" ? "..." : "Perguntar"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

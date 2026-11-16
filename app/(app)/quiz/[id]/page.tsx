import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ConfidenceMeter } from "@/components/quiz/confidence-meter";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { SimuladoRunner } from "@/components/quiz/simulado-runner";
import { isTrueFalse } from "@/lib/exam-styles";
import { confidenceStats } from "@/lib/quiz/confidence";
import { letterToIndex } from "@/lib/quiz/options";
import { formatDuration, simuladoReport } from "@/lib/quiz/report";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/** Como mostrar uma resposta: letra + texto, ou só "Certo"/"Errado". */
function answerText(options: string[], letter: string) {
  const text = options[letterToIndex(letter)];
  return isTrueFalse(options) ? text : `${letter}) ${text ?? ""}`;
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, subject_id, question_ids, mode, style, time_limit_s, started_at, finished_at")
    .eq("id", id)
    .maybeSingle();
  if (!quiz) notFound();

  const [{ data: questions }, { data: attempts }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, stem, options_json, answer, explanation, chunk_id, source_page, topics(name)")
      .in("id", quiz.question_ids),
    supabase.from("attempts").select("question_id, answer, correct, confidence, time_ms").eq("quiz_id", id),
  ]);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const ordered = quiz.question_ids.map((qid) => byId.get(qid)).filter((q) => !!q);
  const attemptByQ = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  const pending = ordered.filter((q) => !attemptByQ.has(q.id));
  const simulado = quiz.mode === "simulado";
  // O gabarito NÃO vai para o navegador.
  const publicQuestions = (qs: typeof ordered) => qs.map((q) => ({ id: q.id, stem: q.stem, options: (q.options_json as string[]) ?? [] }));

  const back = (
    <Link href={`/subjects/${quiz.subject_id}`} className="text-muted-foreground text-sm hover:underline">
      ← Voltar para a matéria
    </Link>
  );

  if (simulado && !quiz.finished_at) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <SimuladoRunner quizId={id} questions={publicQuestions(ordered)} startedAt={quiz.started_at} timeLimitS={quiz.time_limit_s ?? 3600} />
      </div>
    );
  }

  if (!simulado && pending.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <QuizRunner quizId={id} offset={ordered.length - pending.length} total={ordered.length} questions={publicQuestions(pending)} />
      </div>
    );
  }

  const correct = (attempts ?? []).filter((a) => a.correct).length;
  const report = simulado
    ? simuladoReport({
        questions: ordered.map((q) => ({ id: q.id, topicName: q.topics?.name ?? null })),
        attempts: attempts ?? [],
        style: quiz.style,
        timeLimitS: quiz.time_limit_s ?? 0,
        startedAt: quiz.started_at,
        finishedAt: quiz.finished_at,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="bg-pastel-lilac animate-rise rounded-2xl p-6">
        <h1 className="text-2xl font-bold">{simulado ? "Resultado do simulado" : "Resultado"}</h1>
        <p className="text-3xl font-semibold" data-testid="quiz-score">
          {correct} de {ordered.length} acertos
        </p>
        <p className="text-foreground/75 text-sm">{quiz.title}</p>
      </div>

      {report && (
        <section className="grid gap-3" data-testid="simulado-report">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Aproveitamento" value={`${report.percent}%`} />
            <Stat label="Erradas / em branco" value={`${report.wrong} / ${report.blank}`} />
            <Stat label="Tempo usado" value={`${formatDuration(report.usedMs)} de ${formatDuration(report.limitMs)}`} />
            <Stat label="Média por questão" value={formatDuration(report.avgMsPerAnswered)} />
          </div>
          {report.cebraspeNet != null && (
            <p className="bg-card rounded-xl border p-3 text-sm">
              Nota Cebraspe (cada errada anula uma certa): <strong>{report.cebraspeNet}</strong> de {report.total}
            </p>
          )}
          {report.weakTopics.length > 0 && (
            <div className="bg-pastel-rose/60 grid gap-1 rounded-xl p-4 text-sm" data-testid="weak-topics">
              <span className="font-semibold">Tópicos fracos</span>
              {report.weakTopics.map((t) => (
                <span key={t.name}>
                  {t.name}: {t.correct} de {t.total}
                </span>
              ))}
            </div>
          )}
          <div className="grid gap-1">
            <span className="text-sm font-semibold">Tempo por questão</span>
            <div className="flex h-24 items-end gap-1" aria-label="Tempo por questão">
              {report.timeByQuestion.map((t) => {
                const max = Math.max(...report.timeByQuestion.map((x) => x.ms ?? 0), 1);
                return (
                  <div
                    key={t.id}
                    title={`Questão ${t.index + 1}: ${formatDuration(t.ms)}${t.correct == null ? " (em branco)" : t.correct ? " ✓" : " ✗"}`}
                    className={cn(
                      "min-h-1 flex-1 rounded-t",
                      t.correct == null ? "bg-muted" : t.correct ? "bg-success/60" : "bg-destructive/60",
                    )}
                    style={{ height: `${((t.ms ?? 0) / max) * 100}%` }}
                  />
                );
              })}
            </div>
            <span className="text-muted-foreground text-xs">Verde = acertou, vermelho = errou, cinza = em branco.</span>
          </div>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Falsa certeza {simulado ? "neste simulado" : "neste quiz"}</h2>
        <ConfidenceMeter stats={confidenceStats(attempts ?? [])} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Questões</h2>
        <ol className="grid gap-3" data-testid="quiz-review">
          {ordered.map((q, i) => {
            const a = attemptByQ.get(q.id);
            const options = (q.options_json as string[]) ?? [];
            return (
              <li key={q.id} className={cn("bg-card grid gap-2 rounded-xl border p-4 text-sm", a && !a.correct && "border-destructive/40")}>
                <p className="font-medium">
                  {i + 1}. {q.stem}
                </p>
                <p>
                  {!a ? (
                    <>
                      — Em branco · certa: <strong>{answerText(options, q.answer)}</strong>
                    </>
                  ) : (
                    <>
                      {a.correct ? "✓" : "✗"} Você marcou <strong>{answerText(options, a.answer)}</strong>
                      {!a.correct && (
                        <>
                          {" "}
                          · certa: <strong>{answerText(options, q.answer)}</strong>
                        </>
                      )}
                    </>
                  )}
                </p>
                {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
                {q.chunk_id && (
                  <Link href={`/chunks/${q.chunk_id}?q=${q.id}`} data-testid="source-link" className="text-primary font-medium underline">
                    Ver no material{q.source_page != null ? ` (p. ${q.source_page})` : ""}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

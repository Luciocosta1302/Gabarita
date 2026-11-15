import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ConfidenceMeter } from "@/components/quiz/confidence-meter";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { confidenceStats } from "@/lib/quiz/confidence";
import { letterToIndex } from "@/lib/quiz/options";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id, title, subject_id, question_ids").eq("id", id).maybeSingle();
  if (!quiz) notFound();

  const [{ data: questions }, { data: attempts }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, stem, options_json, answer, explanation, chunk_id, source_page")
      .in("id", quiz.question_ids),
    supabase.from("attempts").select("question_id, answer, correct, confidence").eq("quiz_id", id),
  ]);
  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const ordered = quiz.question_ids.map((qid) => byId.get(qid)).filter((q) => !!q);
  const attemptByQ = new Map((attempts ?? []).map((a) => [a.question_id, a]));
  const pending = ordered.filter((q) => !attemptByQ.has(q.id));

  const back = (
    <Link href={`/subjects/${quiz.subject_id}`} className="text-muted-foreground text-sm hover:underline">
      ← Voltar para a matéria
    </Link>
  );

  if (pending.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <QuizRunner
          quizId={id}
          offset={ordered.length - pending.length}
          total={ordered.length}
          // O gabarito NÃO vai para o navegador.
          questions={pending.map((q) => ({ id: q.id, stem: q.stem, options: (q.options_json as string[]) ?? [] }))}
        />
      </div>
    );
  }

  const correct = (attempts ?? []).filter((a) => a.correct).length;
  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="bg-pastel-lilac animate-rise rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Resultado</h1>
        <p className="text-3xl font-semibold" data-testid="quiz-score">
          {correct} de {ordered.length} acertos
        </p>
        <p className="text-foreground/75 text-sm">{quiz.title}</p>
      </div>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Falsa certeza neste quiz</h2>
        <ConfidenceMeter stats={confidenceStats(attempts ?? [])} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Questões</h2>
        <ol className="grid gap-3" data-testid="quiz-review">
          {ordered.map((q, i) => {
            const a = attemptByQ.get(q.id)!;
            const options = (q.options_json as string[]) ?? [];
            return (
              <li key={q.id} className={cn("bg-card grid gap-2 rounded-xl border p-4 text-sm", !a.correct && "border-destructive/40")}>
                <p className="font-medium">
                  {i + 1}. {q.stem}
                </p>
                <p>
                  {a.correct ? "✓" : "✗"} Você marcou <strong>{a.answer}</strong>
                  {a.correct ? "" : <> · certa: <strong>{q.answer}</strong> — {options[letterToIndex(q.answer)]}</>}
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

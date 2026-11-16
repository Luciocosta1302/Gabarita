import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { SimuladoRunner } from "@/components/quiz/simulado-runner";
import { isTrueFalse } from "@/lib/exam-styles";
import { letterToIndex } from "@/lib/quiz/options";
import { roomQuizKeyFor, type RoomQuestion } from "@/lib/rooms/service";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function RoomQuizPage({ params }: { params: Promise<{ code: string; quizId: string }> }) {
  const { code, quizId } = await params;
  if (!z.uuid().safeParse(quizId).success) notFound();
  const { supabase, user } = await getUser();
  const { data: rq } = await supabase.from("room_quizzes").select("id, title, questions_json, time_limit_s, room_id").eq("id", quizId).maybeSingle();
  if (!rq) notFound();
  const questions = rq.questions_json as unknown as RoomQuestion[];
  const review = await roomQuizKeyFor(user!.id, rq.id);
  const back = (
    <Link href={`/rooms/${code}`} className="text-muted-foreground text-sm hover:underline">
      ← Voltar para a sala
    </Link>
  );

  if (!review) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <h1 className="text-2xl font-bold">{rq.title}</h1>
        <SimuladoRunner quizId={rq.id} questions={questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options }))} startedAt={null} timeLimitS={rq.time_limit_s} room />
      </div>
    );
  }

  const { data: attempts } = await supabase.from("room_attempts").select("user_id, correct, total, time_ms").eq("room_quiz_id", rq.id).order("correct", { ascending: false });
  const { data: members } = await supabase.rpc("room_member_names", { p_room_id: rq.room_id });
  const names = new Map((members ?? []).map((m) => [m.user_id, m.name]));
  const correct = questions.filter((q) => review.mine[q.id] && review.key[q.id] && letterToIndex(review.mine[q.id]!) === letterToIndex(review.key[q.id].answer)).length;

  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="bg-pastel-lilac rounded-2xl p-6">
        <h1 className="text-2xl font-bold">{rq.title}</h1>
        <p className="text-3xl font-semibold" data-testid="room-quiz-score">
          {correct} de {questions.length} acertos
        </p>
      </div>
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Como a turma foi</h2>
        <ol className="grid gap-1 text-sm" data-testid="room-quiz-ranking">
          {(attempts ?? []).map((a, i) => (
            <li key={a.user_id} className={cn("flex justify-between rounded-lg border px-3 py-2", a.user_id === user!.id && "border-primary bg-accent")}>
              <span>
                {i + 1}º {names.get(a.user_id) ?? "colega"}
              </span>
              <span>
                {a.correct}/{a.total}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Gabarito</h2>
        <ol className="grid gap-3">
          {questions.map((q, i) => {
            const chosen = review.mine[q.id];
            const k = review.key[q.id];
            const ok = !!chosen && !!k && letterToIndex(chosen) === letterToIndex(k.answer);
            const text = (l: string) => (isTrueFalse(q.options) ? q.options[letterToIndex(l)] : `${l}) ${q.options[letterToIndex(l)] ?? ""}`);
            return (
              <li key={q.id} className={cn("bg-card grid gap-1 rounded-xl border p-4 text-sm", !ok && "border-destructive/40")}>
                <p className="font-medium">
                  {i + 1}. {q.stem}
                </p>
                <p>
                  {chosen ? `${ok ? "✓" : "✗"} Você marcou ${text(chosen)}` : "— Em branco"}
                  {!ok && k ? ` · certa: ${text(k.answer)}` : ""}
                </p>
                {k?.explanation && <p className="text-muted-foreground">{k.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

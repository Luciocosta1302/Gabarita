import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MaterialList } from "@/components/materials/material-list";
import { UploadForm } from "@/components/materials/upload-form";
import { ConfidenceMeter } from "@/components/quiz/confidence-meter";
import { GenerateQuizForm } from "@/components/quiz/generate-quiz-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_STYLE_LABELS, type ExamStyle } from "@/lib/exam-styles";
import { confidenceStats } from "@/lib/quiz/confidence";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (!subject) notFound();

  const [{ data: materials }, { data: quizzes }, { data: attempts }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, title, type, status, page_count, error")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quizzes")
      .select("id, title, created_at, question_ids")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("attempts")
      .select("quiz_id, correct, confidence, questions!inner(subject_id)")
      .eq("questions.subject_id", id)
      .limit(5000),
  ]);

  const ready = (materials ?? []).filter((m) => m.status === "ready");
  const byQuiz = new Map<string, { answered: number; correct: number }>();
  for (const a of attempts ?? []) {
    if (!a.quiz_id) continue;
    const s = byQuiz.get(a.quiz_id) ?? { answered: 0, correct: 0 };
    s.answered++;
    if (a.correct) s.correct++;
    byQuiz.set(a.quiz_id, s);
  }

  const actions = [
    { href: `/chat/${id}`, title: "Conversar com o material", text: "Tire dúvidas com respostas que citam a página.", color: "bg-pastel-lilac" },
    { href: "#questoes", title: "Gerar questões", text: "Múltipla escolha, cada uma com a fonte.", color: "bg-pastel-peach" },
    { href: `/subjects/${id}/flashcards`, title: "Flashcards", text: "Cartões para memorizar o essencial.", color: "bg-pastel-mint" },
    { href: `/errors?subject=${id}`, title: "Caderno de erros", text: "Seus erros com explicação e questão parecida.", color: "bg-pastel-rose" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise">
        <Link href="/dashboard" className="text-muted-foreground text-sm hover:underline">
          ← Início
        </Link>
        <h1 className="mt-1 text-3xl font-bold">{subject.name}</h1>
        <p className="text-muted-foreground text-sm">
          {EXAM_STYLE_LABELS[subject.exam_style as ExamStyle] ?? subject.exam_style}
          {subject.exam_date && ` · prova em ${subject.exam_date.split("-").reverse().join("/")}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((a, i) => (
          <Link
            key={a.title}
            href={a.href}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn("animate-rise rounded-2xl p-4 shadow-sm transition-transform hover:-translate-y-0.5", a.color)}
          >
            <span className="font-semibold">{a.title} →</span>
            <span className="text-foreground/75 mt-1 block text-xs">{a.text}</span>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <UploadForm subjectId={id} />
          <MaterialList materials={materials ?? []} />
        </CardContent>
      </Card>

      <Card id="questoes">
        <CardHeader>
          <CardTitle>Gerar questões</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateQuizForm subjectId={id} materials={ready.map((m) => ({ id: m.id, title: m.title }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medidor de falsa certeza</CardTitle>
        </CardHeader>
        <CardContent>
          <ConfidenceMeter stats={confidenceStats(attempts ?? [])} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de questões</CardTitle>
        </CardHeader>
        <CardContent>
          {!quizzes?.length ? (
            <p className="text-muted-foreground text-sm">Nenhuma bateria de questões ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="quiz-history">
              {quizzes.map((q) => {
                const s = byQuiz.get(q.id) ?? { answered: 0, correct: 0 };
                const total = q.question_ids.length;
                return (
                  <li key={q.id}>
                    <Link href={`/quiz/${q.id}`} className="hover:bg-accent flex justify-between gap-3 rounded-xl border p-3 text-sm">
                      <span>
                        {q.title}
                        <span className="text-muted-foreground block text-xs">
                          {new Date(q.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {s.answered < total ? `${s.answered}/${total} respondidas` : `${s.correct}/${total} acertos`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

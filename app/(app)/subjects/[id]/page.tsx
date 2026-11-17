import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AutoRefresh } from "@/components/layout/auto-refresh";
import { MaterialList } from "@/components/materials/material-list";
import { UploadForm } from "@/components/materials/upload-form";
import { EditSubject } from "@/components/subjects/edit-subject";
import { ConfidenceMeter } from "@/components/quiz/confidence-meter";
import { GenerateQuizForm } from "@/components/quiz/generate-quiz-form";
import { SimuladoForm } from "@/components/quiz/simulado-form";
import { DomainMap } from "@/components/topics/domain-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_STYLE_LABELS, type ExamStyle } from "@/lib/exam-styles";
import { daysBetween, todayBR } from "@/lib/dates";
import { confidenceStats } from "@/lib/quiz/confidence";
import { loadTopicStats } from "@/lib/topics/stats";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (!subject) notFound();

  const today = todayBR();
  const [{ data: materials }, { data: quizzes }, { data: attempts }, topics, { data: planToday }, { count: clustering }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, title, type, status, page_count, error")
      .eq("subject_id", id)
      .neq("type", "past_exam")
      .order("created_at", { ascending: false }),
    supabase
      .from("quizzes")
      .select("id, title, created_at, question_ids, mode")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("attempts")
      .select("quiz_id, correct, confidence, questions!inner(subject_id)")
      .eq("questions.subject_id", id)
      .limit(5000),
    loadTopicStats(supabase, id),
    supabase.from("plan_days").select("tasks_json, study_plans!inner(subject_id)").eq("study_plans.subject_id", id).eq("date", today).maybeSingle(),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"])
      .in("kind", ["ingest_material", "cluster_topics"]),
  ]);
  const { count: teacherCount } = await supabase.from("teacher_profiles").select("id", { count: "exact", head: true }).eq("subject_id", id);
  const hasTeacher = (teacherCount ?? 0) > 0;
  const todayTasks = ((planToday?.tasks_json ?? []) as { title: string; done?: boolean }[]).filter((t) => !t.done);
  const daysLeft = subject.exam_date ? daysBetween(today, subject.exam_date) : null;


  const ready = (materials ?? []).filter((m) => m.status === "ready");
  const waitingTopics = ready.length > 0 && topics.length === 0 && (clustering ?? 0) > 0;
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
    { href: `/review?subject=${id}`, title: "Revisar hoje", text: "Repetição espaçada dos cartões e erros.", color: "bg-pastel-lilac" },
    { href: "#simulado", title: "Simulado", text: "Prova cronometrada no estilo da banca.", color: "bg-pastel-peach" },
    { href: `/subjects/${id}/professor`, title: "Prova do Professor", text: "Mande provas antigas: o estilo dele e o que mais cai.", color: "bg-pastel-mint" },
    { href: `/subjects/${id}/feynman`, title: "Modo Feynman", text: "Explique com suas palavras (texto ou voz) e veja o que faltou.", color: "bg-pastel-rose" },
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

      <EditSubject subject={subject} />

      <AutoRefresh active={waitingTopics} every={4000} />

      <Link
        href={`/subjects/${id}/plan`}
        data-testid="plan-card"
        className="stamp-press bg-card seigaiha-ink animate-rise grid gap-1 rounded-2xl p-5"
      >
        <span className="font-semibold">Plano até a prova →</span>
        {daysLeft != null && daysLeft > 0 ? (
          <>
            <span className="text-sm">
              Faltam <strong>{daysLeft}</strong> {daysLeft === 1 ? "dia" : "dias"}.{" "}
              {todayTasks.length ? `Hoje: ${todayTasks.slice(0, 3).map((t) => t.title).join(" · ")}` : "Nada pendente hoje."}
            </span>
          </>
        ) : (
          <span className="text-sm">Informe a data da prova e as horas por dia para montar o plano.</span>
        )}
      </Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {actions.map((a, i) => (
          <Link
            key={a.title}
            href={a.href}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn("stamp-press animate-rise rounded-2xl p-4", a.color)}
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

      <Card id="dominio">
        <CardHeader>
          <CardTitle>Mapa de domínio</CardTitle>
        </CardHeader>
        <CardContent>
          {topics.length ? (
            <DomainMap subjectId={id} topics={topics} />
          ) : waitingTopics ? (
            <p className="text-muted-foreground text-sm">Organizando o material em tópicos...</p>
          ) : (
            <p className="text-muted-foreground text-sm">Os tópicos aparecem aqui depois que você envia um material.</p>
          )}
        </CardContent>
      </Card>

      <Card id="questoes">
        <CardHeader>
          <CardTitle>Gerar questões</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateQuizForm
            subjectId={id}
            materials={ready.map((m) => ({ id: m.id, title: m.title }))}
            topics={topics.map((t) => ({ id: t.id, name: t.name }))}
            defaultStyle={subject.exam_style}
            hasTeacher={hasTeacher}
          />
        </CardContent>
      </Card>

      <Card id="simulado">
        <CardHeader>
          <CardTitle>Simulado cronometrado</CardTitle>
          <p className="text-muted-foreground text-sm">Tempo real de prova, sem ver a resposta até entregar. No fim, relatório com tempo por questão e tópicos fracos.</p>
        </CardHeader>
        <CardContent>
          <SimuladoForm subjectId={id} defaultStyle={subject.exam_style} disabled={ready.length === 0} />
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
                        {q.mode === "simulado" && <span className="bg-pastel-peach mr-1 rounded-full px-2 py-0.5 text-xs">⏱</span>}
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

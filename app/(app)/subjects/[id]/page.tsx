import { BookX, GraduationCap, Layers, ListChecks, MessagesSquare, Mic, Plus, RotateCcw, Timer } from "lucide-react";
import { folderCover } from "@/lib/folders/colors";
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
import { ToolGuide } from "@/components/tutorials/tutorials";
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
    { href: `/chat/${id}`, title: "Conversar com a pasta", text: "Perguntas usando todos os arquivos daqui.", color: "bg-pastel-lilac", icon: MessagesSquare },
    { href: "#questoes", title: "Gerar questões", text: "Cada uma com a página de onde saiu.", color: "bg-pastel-peach", icon: ListChecks },
    { href: `/subjects/${id}/flashcards`, title: "Flashcards", text: "Cartões para memorizar.", color: "bg-pastel-mint", icon: Layers },
    { href: "#simulado", title: "Simulado", text: "Prova cronometrada da banca.", color: "bg-pastel-rose", icon: Timer },
    { href: `/review?subject=${id}`, title: "Revisar hoje", text: "O que está para esquecer.", color: "bg-pastel-lilac", icon: RotateCcw },
    { href: `/errors?subject=${id}`, title: "Caderno de erros", text: "Erros com questão parecida.", color: "bg-pastel-peach", icon: BookX },
    { href: `/subjects/${id}/professor`, title: "Prova do Professor", text: "Provas antigas: o que mais cai.", color: "bg-pastel-mint", icon: GraduationCap },
    { href: `/subjects/${id}/feynman`, title: "Modo Feynman", text: "Explique e veja o que faltou.", color: "bg-pastel-rose", icon: Mic },
  ];
  const cover = folderCover(subject.color);

  const materialsCard = (
    <Card id="materiais" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Arquivos e conversas</CardTitle>
        <p className="text-muted-foreground text-sm">Cada arquivo é uma conversa. PDF, slides, Word, fotos, áudio da aula, link ou YouTube.</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MaterialList materials={materials ?? []} subjectId={id} />
        <details open={!(materials ?? []).length} className="group rounded-2xl border-2 border-dashed border-ink/30 p-3 open:border-solid open:border-ink/15">
          <summary className="text-shu flex cursor-pointer items-center gap-2 font-bold select-none">
            <Plus aria-hidden className="size-4" strokeWidth={2.6} /> Adicionar arquivo nesta pasta
          </summary>
          <div className="mt-4">
            <UploadForm subjectId={id} />
          </div>
        </details>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-muted-foreground -mb-3 text-sm hover:underline">
        ← Início
      </Link>
      {/* capa da pasta: cor escolhida, nome, banca e contagem até a prova */}
      <header className={cn("seigaiha animate-rise relative overflow-hidden rounded-3xl border-2 border-ink p-5 shadow-[0_5px_0_var(--ink)] sm:p-6", cover.bg, cover.text)} data-testid="folder-cover">
        <span aria-hidden className="absolute inset-y-0 left-0 w-3 border-r-2 border-ink/60 bg-black/20" />
        <div className="relative ml-3 flex flex-wrap items-end justify-between gap-4">
          <div className="bg-washi text-ink min-w-0 rounded-md border-2 border-ink px-4 py-3 shadow-[0_3px_0_rgb(0_0_0/0.3)]">
            <h1 className="text-2xl leading-tight font-bold [overflow-wrap:anywhere] sm:text-3xl">{subject.name}</h1>
            <p className="text-ink/60 text-xs font-bold tracking-wider uppercase">
              {subject.inbox ? "arquivos soltos" : (EXAM_STYLE_LABELS[subject.exam_style as ExamStyle] ?? subject.exam_style)}
              {subject.exam_date && ` · prova em ${subject.exam_date.split("-").reverse().join("/")}`}
            </p>
          </div>
          <div className="flex items-end gap-3">
            {daysLeft != null && daysLeft >= 0 && (
              <span className="leading-none">
                <span className="font-display block text-4xl font-extrabold">{daysLeft}</span>
                <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">{daysLeft === 1 ? "dia p/ prova" : "dias p/ prova"}</span>
              </span>
            )}
            <span className="text-washi/90 text-right text-xs font-bold">
              {(materials ?? []).length} {(materials ?? []).length === 1 ? "arquivo" : "arquivos"}
            </span>
          </div>
        </div>
        <div className="relative mt-4 ml-3 flex flex-wrap gap-2">
          <a href="#materiais" className="stamp-press bg-washi text-ink flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold">
            <Plus aria-hidden className="size-4" strokeWidth={2.6} />
            Adicionar material
          </a>
          {(materials ?? []).some((m) => m.status === "ready") && (
            <Link href={`/chat/${id}`} className="flex h-10 items-center gap-2 rounded-xl border-2 border-current/60 px-4 text-sm font-bold hover:bg-black/10">
              <MessagesSquare aria-hidden className="size-4" /> Conversar com a pasta
            </Link>
          )}
        </div>
      </header>

      <ToolGuide id="materia" />
      <EditSubject subject={subject} />

      {subject.inbox && (
        <p className="bg-card rounded-2xl border-2 border-ink/15 p-3 text-sm" data-testid="inbox-hint">
          Aqui ficam os arquivos que você mandou sem pasta. Para organizar, abra a conversa do arquivo e toque em <strong>Colocar numa pasta</strong>.
        </p>
      )}

      {materialsCard}

      <AutoRefresh active={waitingTopics} every={4000} />

      {!subject.inbox && (
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
          <span className="text-sm">Tem prova? Coloque a data e as horas por dia em “Editar pasta” e eu monto o plano.</span>
        )}
      </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a, i) => (
          <Link
            key={a.title}
            href={a.href}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn("stamp-press animate-rise grid content-start gap-1 rounded-2xl p-3.5", a.color)}
          >
            <a.icon aria-hidden className="size-5" strokeWidth={1.9} />
            <span className="leading-tight font-bold">{a.title}</span>
            <span className="text-foreground/75 text-xs leading-snug">{a.text}</span>
          </Link>
        ))}
      </div>



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

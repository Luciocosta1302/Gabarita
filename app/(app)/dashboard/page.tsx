import { BookX, CalendarDays, Camera, CheckCircle2, ChevronRight, Circle, Coffee, Flame, LibraryBig, RotateCcw, Route, Timer } from "lucide-react";
import Link from "next/link";

import { Scene } from "@/components/focus/scene";
import { CreateSubjectForm } from "@/components/subjects/create-subject-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markSeen, newAchievements } from "@/lib/achievements/load";
import { daysBetween, TIME_ZONE, todayBR } from "@/lib/dates";
import { EXAM_STYLE_LABELS } from "@/lib/exam-styles";
import { focusStats } from "@/lib/focus/stats";
import { timeOfDay } from "@/lib/focus/scenes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  return hour < 5 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

const SHORTCUTS = [
  { href: "/resolver", label: "Foto da questão", text: "Tire foto e veja a resolução", icon: Camera, color: "bg-pastel-peach" },
  { href: "/trilhas", label: "Trilhas", text: "Aprenda passo a passo com o tutor", icon: Route, color: "bg-pastel-lilac" },
  { href: "/errors", label: "Caderno de erros", text: "Refaça o que você errou", icon: BookX, color: "bg-pastel-rose" },
  { href: "/biblioteca", label: "Biblioteca", text: "Busque nos seus materiais", icon: LibraryBig, color: "bg-pastel-mint" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("name").maybeSingle();
  const firstName = profile?.name?.split(" ")[0];
  const today = todayBR();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const [{ data: planDays }, { count: dueReviews }, focus] = await Promise.all([
    supabase.from("plan_days").select("date, tasks_json, study_plans!inner(subject_id, subjects(name))").eq("date", today),
    supabase.from("reviews").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
    focusStats(supabase, today),
  ]);
  const todayTasks = (planDays ?? []).flatMap((d) =>
    ((d.tasks_json ?? []) as { id: string; title: string; done?: boolean }[]).map((t) => ({
      ...t,
      subjectId: d.study_plans.subject_id,
      subject: d.study_plans.subjects?.name ?? "",
    })),
  );
  const doneCount = todayTasks.filter((t) => t.done).length;
  // conquistas novas: anuncia uma vez e marca como vistas
  const fresh = await newAchievements(supabase);
  await markSeen(supabase, fresh.map((b) => b.id));
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_date, exam_style")
    .order("created_at", { ascending: false });
  const due = dueReviews ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* cenário lo-fi que muda com o horário */}
      <section className="animate-rise relative isolate overflow-hidden rounded-3xl shadow-sm">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <Scene scene="quarto" tod={timeOfDay(hour)} raining={false} uid="inicio" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.22_0.04_345/0.85)] via-[oklch(0.22_0.04_345/0.35)] to-transparent" aria-hidden />
        <div className="flex min-h-48 flex-col justify-end gap-3 p-5 text-white md:min-h-60 md:p-8">
          <div>
            <h1 className="text-3xl font-bold drop-shadow md:text-4xl">
              {greeting(hour)}
              {firstName ? `, ${firstName}!` : "!"}
            </h1>
            <p className="text-white/85 text-sm md:text-base">
              {todayTasks.length ? `Hoje: ${doneCount} de ${todayTasks.length} tarefas do plano.` : "Vamos estudar um pouquinho hoje?"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/espaco" className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow transition-transform hover:-translate-y-0.5">
              <Coffee aria-hidden className="size-4" /> Começar a estudar
            </Link>
            {due > 0 && (
              <Link href="/review" className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[oklch(0.27_0.04_350)] shadow">
                <RotateCcw aria-hidden className="size-4" /> Revisar {due}
              </Link>
            )}
          </div>
        </div>
      </section>

      {fresh.length > 0 && (
        <Link href="/conquistas" role="status" data-testid="new-achievements" className="bg-pastel-mint animate-rise flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-3xl" aria-hidden>
            {fresh[0].icon}
          </span>
          <span className="text-sm">
            <strong>{fresh.length === 1 ? "Nova conquista" : `${fresh.length} conquistas novas`}:</strong> {fresh.slice(0, 3).map((b) => b.name).join(", ")}
            {fresh.length > 3 ? ` e mais ${fresh.length - 3}` : ""} 🎉 <span className="underline">Ver conquistas</span>
          </span>
        </Link>
      )}

      {/* números do dia */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Sequência" value={`${focus.streak}`} unit={focus.streak === 1 ? "dia" : "dias"} tone="text-[oklch(0.62_0.17_45)]" />
        <Link href="/review" className="contents">
          <Stat icon={RotateCcw} label="Para revisar" value={`${due}`} unit={due === 1 ? "item" : "itens"} tone="text-primary" testId="due-count" hover />
        </Link>
        <Stat icon={Timer} label="Foco hoje" value={`${focus.todayMinutes}`} unit="min" tone="text-[oklch(0.5_0.1_150)]" />
      </div>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays aria-hidden className="text-primary size-5" /> Seu plano de hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Crie uma matéria com data de prova e o Gabarita monta um plano para cada dia até lá.</p>
            ) : (
              <ul className="grid gap-2 text-sm" data-testid="today-tasks">
                {todayTasks.map((t) => (
                  <li key={`${t.subjectId}-${t.id}`}>
                    <Link href={`/subjects/${t.subjectId}/plan`} className="hover:bg-accent flex items-start gap-2.5 rounded-xl p-2 transition-colors">
                      {t.done ? (
                        <CheckCircle2 aria-label="feita" className="text-success mt-0.5 size-4 shrink-0" />
                      ) : (
                        <Circle aria-label="a fazer" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      )}
                      <span className={cn("flex-1", t.done && "text-muted-foreground line-through")}>
                        {t.title}
                        <span className="text-muted-foreground block text-xs">{t.subject}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <nav aria-label="Atalhos" className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} className={cn("grid content-start gap-1 rounded-2xl p-4 shadow-sm transition-transform hover:-translate-y-0.5", s.color)}>
                <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="text-foreground/70 text-xs leading-snug">{s.text}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Suas matérias</h2>
        {!subjects?.length ? (
          <p className="text-muted-foreground text-sm">Nenhuma matéria ainda. Crie a primeira aqui embaixo e mande seu material.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="subject-list">
            {subjects.map((s) => {
              const left = s.exam_date ? daysBetween(today, s.exam_date) : null;
              return (
                <li key={s.id} className="min-w-0">
                  <Link href={`/subjects/${s.id}`} className="bg-card group flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <span className="bg-pastel-lilac font-display grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold" aria-hidden>
                      {s.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {EXAM_STYLE_LABELS[s.exam_style as keyof typeof EXAM_STYLE_LABELS] ?? s.exam_style}
                        {s.exam_date && ` · prova em ${formatDate(s.exam_date)}`}
                      </span>
                    </span>
                    {left != null && left >= 0 && (
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", left <= 7 ? "bg-pastel-rose" : "bg-pastel-mint")}>
                        {left === 0 ? "é hoje!" : `${left} ${left === 1 ? "dia" : "dias"}`}
                      </span>
                    )}
                    <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Nova matéria</CardTitle>
          <p className="text-muted-foreground text-sm">Com a data da prova, você ganha um plano de estudo diário.</p>
        </CardHeader>
        <CardContent>
          <CreateSubjectForm />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  testId,
  hover,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  unit: string;
  tone: string;
  testId?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("bg-card grid gap-1 rounded-2xl border p-3 shadow-sm md:p-4", hover && "transition-transform hover:-translate-y-0.5")}>
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon aria-hidden className={cn("size-4", tone)} />
        {label}
      </span>
      <span>
        <span className="font-display text-2xl font-bold md:text-3xl" data-testid={testId}>
          {value}
        </span>{" "}
        <span className="text-muted-foreground text-xs">{unit}</span>
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

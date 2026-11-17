import {
  BookX,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  Coffee,
  Flame,
  LibraryBig,
  Plus,
  RotateCcw,
  Route,
  ScanLine,
  Search,
  Timer,
} from "lucide-react";
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
  return hour < 5
    ? "Boa madrugada"
    : hour < 12
      ? "Bom dia"
      : hour < 18
        ? "Boa tarde"
        : "Boa noite";
}

const TILE_COLORS = [
  "bg-pastel-peach",
  "bg-pastel-mint",
  "bg-pastel-lilac",
  "bg-pastel-rose",
];

const SHORTCUTS = [
  {
    href: "/resolver",
    label: "Foto da questão",
    text: "Tire foto e veja a resolução",
    icon: Camera,
    color: "bg-pastel-peach",
  },
  {
    href: "/trilhas",
    label: "Trilhas",
    text: "Aprenda passo a passo com o tutor",
    icon: Route,
    color: "bg-pastel-lilac",
  },
  {
    href: "/errors",
    label: "Caderno de erros",
    text: "Refaça o que você errou",
    icon: BookX,
    color: "bg-pastel-rose",
  },
  {
    href: "/biblioteca",
    label: "Biblioteca",
    text: "Busque nos seus materiais",
    icon: LibraryBig,
    color: "bg-pastel-mint",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .maybeSingle();
  const firstName = profile?.name?.split(" ")[0];
  const today = todayBR();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const [{ data: planDays }, { count: dueReviews }, focus] = await Promise.all([
    supabase
      .from("plan_days")
      .select("date, tasks_json, study_plans!inner(subject_id, subjects(name))")
      .eq("date", today),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .lte("due_at", new Date().toISOString()),
    focusStats(supabase, today),
  ]);
  const todayTasks = (planDays ?? []).flatMap((d) =>
    (
      (d.tasks_json ?? []) as { id: string; title: string; done?: boolean }[]
    ).map((t) => ({
      ...t,
      subjectId: d.study_plans.subject_id,
      subject: d.study_plans.subjects?.name ?? "",
    })),
  );
  const doneCount = todayTasks.filter((t) => t.done).length;
  // as pendentes primeiro; no máximo 6 na tela inicial
  const shownTasks = [...todayTasks].sort((a, b) => Number(!!a.done) - Number(!!b.done)).slice(0, 6);
  // conquistas novas: anuncia uma vez e marca como vistas
  const fresh = await newAchievements(supabase);
  await markSeen(
    supabase,
    fresh.map((b) => b.id),
  );
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_date, exam_style")
    .order("created_at", { ascending: false });
  const due = dueReviews ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* topo: cenário lo-fi que muda com o horário + matérias */}
      <section className="animate-rise relative isolate -mx-4 -mt-4 overflow-hidden pb-10 md:mx-0 md:mt-0 md:rounded-3xl md:shadow-sm">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <Scene
            scene="quarto"
            tod={timeOfDay(hour)}
            raining={false}
            uid="inicio"
          />
        </div>
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.22_0.04_345/0.45)] via-[oklch(0.22_0.04_345/0.1)] to-[oklch(0.22_0.04_345/0.6)]"
          aria-hidden
        />
        <div className="grid gap-5 p-5 text-white md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/80">{greeting(hour)}!</p>
              <h1 className="text-3xl font-bold drop-shadow md:text-4xl">
                {firstName ?? "Vamos estudar"}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/biblioteca"
                aria-label="Buscar nos materiais"
                className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <Search aria-hidden className="size-5" />
              </Link>
              <Link
                href="/resolver"
                aria-label="Foto da questão"
                className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <ScanLine aria-hidden className="size-5" />
              </Link>
            </div>
          </div>
          <p className="text-white/90">
            {subjects?.length
              ? "Qual matéria você quer estudar hoje?"
              : "Crie sua primeira matéria e mande o material da prova."}
          </p>
          <ul
            className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0"
            data-testid="subject-list"
          >
            {(subjects ?? []).map((s, i) => {
              const left = s.exam_date ? daysBetween(today, s.exam_date) : null;
              return (
                <li key={s.id} className="shrink-0 snap-start">
                  <Link
                    href={`/subjects/${s.id}`}
                    className={cn(
                      "grid h-32 w-36 content-between rounded-2xl p-3.5 text-[oklch(0.27_0.04_350)] shadow-md transition-transform hover:-translate-y-0.5",
                      TILE_COLORS[i % TILE_COLORS.length],
                    )}
                  >
                    <span className="flex items-start justify-between">
                      <span
                        className="font-display text-2xl font-bold"
                        aria-hidden
                      >
                        {s.name.trim().charAt(0).toUpperCase()}
                      </span>
                      {left != null && left >= 0 && (
                        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium">
                          {left === 0 ? "hoje!" : `${left}d`}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm leading-tight font-semibold">
                        {s.name}
                      </span>
                      <span className="block truncate text-[11px] opacity-70">
                        {EXAM_STYLE_LABELS[
                          s.exam_style as keyof typeof EXAM_STYLE_LABELS
                        ] ?? s.exam_style}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 snap-start">
              <a
                href="#nova-materia"
                className="grid h-32 w-36 place-content-center justify-items-center gap-1 rounded-2xl border border-dashed border-white/50 bg-white/10 text-sm text-white backdrop-blur transition hover:bg-white/20"
              >
                <Plus aria-hidden className="size-6" />
                Nova matéria
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* painel que sobe por cima do cenário */}
      <div className="bg-background relative -mx-4 -mt-12 flex flex-col gap-6 rounded-t-3xl px-4 pt-3 md:mx-0 md:-mt-10 md:rounded-3xl md:px-0 md:pt-0 md:bg-transparent">
        <span
          className="bg-border mx-auto h-1.5 w-12 rounded-full md:hidden"
          aria-hidden
        />

        <Link
          href="/espaco"
          className="from-primary flex items-center gap-4 rounded-2xl bg-gradient-to-r to-[oklch(0.62_0.12_25)] p-4 text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[oklch(0.47_0.1_5)]">
            <Coffee aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Começar a estudar</span>
            <span className="block truncate text-sm text-white/85">
              {todayTasks.length
                ? `Plano de hoje: ${doneCount} de ${todayTasks.length} feitas`
                : "Pomodoro, música lo-fi e chuva"}
            </span>
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/25">
            <ChevronRight aria-hidden className="size-4" />
          </span>
        </Link>

        {fresh.length > 0 && (
          <Link
            href="/conquistas"
            role="status"
            data-testid="new-achievements"
            className="bg-pastel-mint animate-rise flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 shadow-sm"
          >
            <span className="text-3xl" aria-hidden>
              {fresh[0].icon}
            </span>
            <span className="text-sm">
              <strong>
                {fresh.length === 1
                  ? "Nova conquista"
                  : `${fresh.length} conquistas novas`}
                :
              </strong>{" "}
              {fresh
                .slice(0, 3)
                .map((b) => b.name)
                .join(", ")}
              {fresh.length > 3 ? ` e mais ${fresh.length - 3}` : ""} 🎉{" "}
              <span className="underline">Ver conquistas</span>
            </span>
          </Link>
        )}

        {/* números do dia */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={Flame}
            label="Sequência"
            value={`${focus.streak}`}
            unit={focus.streak === 1 ? "dia" : "dias"}
            tone="text-[oklch(0.62_0.17_45)]"
          />
          <Link href="/review" className="contents">
            <Stat
              icon={RotateCcw}
              label="Para revisar"
              value={`${due}`}
              unit={due === 1 ? "item" : "itens"}
              tone="text-primary"
              testId="due-count"
              hover
            />
          </Link>
          <Stat
            icon={Timer}
            label="Foco hoje"
            value={`${focus.todayMinutes}`}
            unit="min"
            tone="text-[oklch(0.5_0.1_150)]"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays aria-hidden className="text-primary size-5" /> Seu
                plano de hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Crie uma matéria com data de prova e o Gabarita monta um plano
                  para cada dia até lá.
                </p>
              ) : (
                <ul className="grid gap-2 text-sm" data-testid="today-tasks">
                  {shownTasks.map((t) => (
                    <li key={`${t.subjectId}-${t.id}`}>
                      <Link
                        href={`/subjects/${t.subjectId}/plan`}
                        className="hover:bg-accent flex items-start gap-2.5 rounded-xl p-2 transition-colors"
                      >
                        {t.done ? (
                          <CheckCircle2
                            aria-label="feita"
                            className="text-success mt-0.5 size-4 shrink-0"
                          />
                        ) : (
                          <Circle
                            aria-label="a fazer"
                            className="text-muted-foreground mt-0.5 size-4 shrink-0"
                          />
                        )}
                        <span
                          className={cn(
                            "flex-1",
                            t.done && "text-muted-foreground line-through",
                          )}
                        >
                          {t.title}
                          <span className="text-muted-foreground block text-xs">
                            {t.subject}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {todayTasks.length > shownTasks.length && (
                    <li>
                      <Link href={`/subjects/${todayTasks[0].subjectId}/plan`} className="text-primary px-2 text-xs font-medium hover:underline">
                        + {todayTasks.length - shownTasks.length} tarefas — ver o plano completo
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <nav aria-label="Atalhos" className="grid grid-cols-2 content-start gap-3">
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={cn(
                    "grid content-start gap-1 rounded-2xl p-4 shadow-sm transition-transform hover:-translate-y-0.5",
                    s.color,
                  )}
                >
                  <Icon aria-hidden className="size-5" strokeWidth={1.8} />
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-foreground/70 text-xs leading-snug">
                    {s.text}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <Card id="nova-materia" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Nova matéria</CardTitle>
            <p className="text-muted-foreground text-sm">
              Com a data da prova, você ganha um plano de estudo diário.
            </p>
          </CardHeader>
          <CardContent>
            <CreateSubjectForm />
          </CardContent>
        </Card>
      </div>
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
    <div
      className={cn(
        "bg-card grid gap-1 rounded-2xl border p-3 shadow-sm md:p-4",
        hover && "transition-transform hover:-translate-y-0.5",
      )}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon aria-hidden className={cn("size-4", tone)} />
        {label}
      </span>
      <span>
        <span
          className="font-display text-2xl font-bold md:text-3xl"
          data-testid={testId}
        >
          {value}
        </span>{" "}
        <span className="text-muted-foreground text-xs">{unit}</span>
      </span>
    </div>
  );
}

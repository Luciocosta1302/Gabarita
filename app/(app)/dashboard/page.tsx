import { ArrowRight, BookX, Camera, Circle, FilePlus2, LibraryBig, MessagesSquare, Plus, RotateCcw, Route, ScanLine, Search } from "lucide-react";
import Link from "next/link";

import { Hanko } from "@/components/brand/hanko";
import { MascotSays } from "@/components/brand/mascot-says";
import { Medal } from "@/components/brand/medal";
import { CreateSubjectForm } from "@/components/subjects/create-subject-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Counter } from "@/components/ui/counter";
import { markSeen, newAchievements } from "@/lib/achievements/load";
import { mascotLine, weekSeals } from "@/lib/brand/mascot";
import { addDays, daysBetween, TIME_ZONE, todayBR } from "@/lib/dates";
import { EXAM_STYLE_LABELS } from "@/lib/exam-styles";
import { focusStats } from "@/lib/focus/stats";
import { streakDays } from "@/lib/focus/scenes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  return hour < 5 ? "Boa madrugada" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

/** Capas dos cadernos (cores tradicionais) — cada matéria é um caderno de selos. */
const COVERS = [
  { bg: "bg-ai", text: "text-washi" },
  { bg: "bg-shu", text: "text-washi" },
  { bg: "bg-matcha", text: "text-washi" },
  { bg: "bg-[#3b2f2a]", text: "text-washi" },
];

const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];

const SHORTCUTS = [
  { href: "/resolver", label: "Foto da questão", text: "Resolve e mostra onde estudar", icon: Camera },
  { href: "/trilhas", label: "Trilhas", text: "Passo a passo com o tutor", icon: Route },
  { href: "/errors", label: "Caderno de erros", text: "Refaça o que você errou", icon: BookX },
  { href: "/biblioteca", label: "Biblioteca", text: "Busque nos seus materiais", icon: LibraryBig },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("name").maybeSingle();
  const firstName = profile?.name?.split(" ")[0];
  const today = todayBR();
  const weekAgo = addDays(today, -7);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const [{ data: planDays }, { count: dueReviews }, focus, { data: recentAttempts }, { data: recentSessions }, { data: subjects }] = await Promise.all([
    supabase.from("plan_days").select("date, tasks_json, study_plans!inner(subject_id, subjects(name))").eq("date", today),
    supabase.from("reviews").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
    focusStats(supabase, today),
    supabase.from("attempts").select("created_at").gte("created_at", `${addDays(today, -60)}T00:00:00-03:00`).order("created_at", { ascending: false }).limit(3000),
    supabase.from("study_sessions").select("ended_at").gte("ended_at", `${addDays(today, -60)}T00:00:00-03:00`).limit(3000),
    supabase.from("subjects").select("id, name, exam_date, exam_style, inbox").order("created_at", { ascending: false }),
  ]);
  // conversas = arquivos (cada arquivo é uma conversa), as mais recentes primeiro
  const { data: convos } = await supabase
    .from("materials")
    .select("id, title, type, status, subject_id, subjects(name, inbox)")
    .neq("type", "past_exam")
    .order("created_at", { ascending: false })
    .limit(6);
  // a "Sem pasta" vai por último, e só aparece se tiver algum arquivo
  const inbox = (subjects ?? []).find((x) => x.inbox);
  const { count: inboxFiles } = inbox ? await supabase.from("materials").select("id", { count: "exact", head: true }).eq("subject_id", inbox.id) : { count: 0 };
  const folders = [...(subjects ?? [])].filter((x) => !x.inbox || (inboxFiles ?? 0) > 0).sort((a, b) => Number(a.inbox) - Number(b.inbox));
  const todayTasks = (planDays ?? []).flatMap((d) =>
    ((d.tasks_json ?? []) as { id: string; title: string; done?: boolean }[]).map((t) => ({
      ...t,
      subjectId: d.study_plans.subject_id,
      subject: d.study_plans.subjects?.name ?? "",
    })),
  );
  const doneCount = todayTasks.filter((t) => t.done).length;
  // as pendentes primeiro; no máximo 6 na tela inicial
  const shownTasks = [...todayTasks].sort((a, b) => Number(!!a.done) - Number(!!b.done)).slice(0, 6);

  // dia estudado = respondeu questão ou fez um foco no Pomodoro
  const studyDates = new Set([
    ...(recentAttempts ?? []).map((a) => todayBR(new Date(a.created_at))),
    ...(recentSessions ?? []).map((s) => todayBR(new Date(s.ended_at))),
  ]);
  const streak = streakDays([...studyDates], today);
  const seals = weekSeals(studyDates, today, addDays).filter((d) => d.date > weekAgo);

  // conquistas novas: anuncia uma vez e marca como vistas
  const fresh = await newAchievements(supabase);
  await markSeen(supabase, fresh.map((b) => b.id));

  const due = dueReviews ?? 0;
  const withDates = (subjects ?? [])
    .filter((s) => s.exam_date && daysBetween(today, s.exam_date) >= 0)
    .map((s) => ({ name: s.name, daysLeft: daysBetween(today, s.exam_date!) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const { text: lineText, ...linePose } = mascotLine({
    hour,
    hasSubjects: !!subjects?.length,
    due,
    tasksTotal: todayTasks.length,
    tasksDone: doneCount,
    nextTask: shownTasks.find((t) => !t.done)?.title.toLowerCase() ?? null,
    nearest: withDates[0] ?? null,
    streak,
    studiedToday: studyDates.has(today),
  });

  return (
    <div className="flex flex-col gap-7">
      {/* cabeçalho: data, saudação e atalhos de busca/câmera */}
      <header className="animate-rise flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span className="font-display text-shu text-sm tracking-normal" lang="ja" title="kyō, hoje">
              今日
            </span>
            {dateLabel}
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {greeting(hour)}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
        </div>
        <div className="flex gap-2 pt-1">
          <Link href="/biblioteca" aria-label="Buscar nos materiais" className="bg-card grid size-10 place-items-center rounded-full border-2 border-ink transition hover:bg-accent">
            <Search aria-hidden className="size-[18px]" />
          </Link>
          <Link href="/resolver" aria-label="Foto da questão" className="bg-card grid size-10 place-items-center rounded-full border-2 border-ink transition hover:bg-accent">
            <ScanLine aria-hidden className="size-[18px]" />
          </Link>
        </div>
      </header>

      {/* um personagem da turma fala com o aluno */}
      <MascotSays pose={linePose} className="animate-rise">
        {lineText}
      </MascotSays>

      {fresh.length > 0 && (
        <Link href="/conquistas" role="status" data-testid="new-achievements" className="bg-card animate-rise flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink px-4 py-3 shadow-[0_3px_0_var(--ink)]">
          <Medal kanji={fresh[0].icon} meaning={fresh[0].meaning} unlocked className="animate-seal size-10 [animation-delay:400ms]" />
          <span className="text-sm">
            <strong>{fresh.length === 1 ? "Nova conquista" : `${fresh.length} conquistas novas`}:</strong> {fresh.slice(0, 3).map((b) => b.name).join(", ")}
            {fresh.length > 3 ? ` e mais ${fresh.length - 3}` : ""} <span className="text-shu underline">Ver conquistas</span>
          </span>
        </Link>
      )}

      {/* selos da semana (a "sequência" do caderno) + ações principais */}
      <section className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="bg-card rounded-2xl border-[1.5px] border-ink/80 p-4 shadow-[0_3px_0_rgb(31_26_23/0.12)]">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">
              <span className="font-display text-shu mr-1.5 text-sm tracking-normal" lang="ja" title="renzoku, em sequência">
                連続
              </span>
              Selos da semana
            </p>
            <p className="text-sm">
              <Counter value={streak} className="font-display text-xl font-extrabold" /> {streak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
          </div>
          <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Dias estudados nos últimos 7 dias">
            {seals.map((d, si) => {
              const wd = new Date(`${d.date}T12:00:00Z`).getUTCDay();
              return (
                <li key={d.date} className="grid justify-items-center gap-1">
                  <span
                    className={cn(
                      "grid aspect-square w-full max-w-11 place-items-center rounded-lg border-[1.5px] border-dashed",
                      d.studied ? "border-transparent" : "border-ink/25",
                      d.today && !d.studied && "border-shu border-solid",
                    )}
                    aria-label={`${d.date}${d.studied ? ": estudou" : ""}`}
                  >
                    {d.studied && (
                      <span className="animate-seal block size-full" style={{ animationDelay: `${250 + si * 70}ms`, ["--r" as string]: "0deg" }}>
                        <Hanko className="size-full" rotate={((wd * 7) % 11) - 5} />
                      </span>
                    )}
                  </span>
                  <span className={cn("text-[11px]", d.today ? "text-shu font-bold" : "text-muted-foreground")}>{d.today ? "hoje" : WEEKDAY[wd]}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-muted-foreground mt-3 text-xs">Foco hoje: {focus.todayMinutes} min · cada dia estudado ganha um carimbo.</p>
        </div>

        <div className="grid content-start gap-3">
          <Link href="/espaco" className="stamp-press bg-primary text-primary-foreground flex items-center justify-between gap-3 rounded-2xl px-5 py-4">
            <span>
              <span className="block text-lg font-bold">Começar a estudar</span>
              <span className="block text-sm opacity-90">
                {todayTasks.length ? `Plano de hoje: ${doneCount} de ${todayTasks.length}` : "Pomodoro, lo-fi e chuva"}
              </span>
            </span>
            <ArrowRight aria-hidden className="size-6 shrink-0" />
          </Link>
          <Link href="/review" className="stamp-press bg-card flex items-center justify-between gap-3 rounded-2xl px-5 py-3">
            <span className="flex items-center gap-3">
              <RotateCcw aria-hidden className="text-ai size-5" />
              <span className="font-bold">Revisar hoje</span>
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", due ? "bg-shu text-washi" : "bg-muted text-muted-foreground")} data-testid="due-count">
              {due}
            </span>
          </Link>
          <Link href="/adicionar" className="stamp-press bg-card flex items-center gap-3 rounded-2xl px-5 py-3">
            <FilePlus2 aria-hidden className="text-shu size-5" />
            <span>
              <span className="block font-bold">Adicionar material</span>
              <span className="text-muted-foreground block text-xs">PDF, slides, Word, fotos, áudio, link ou YouTube</span>
            </span>
          </Link>
        </div>
      </section>

      {/* conversas: cada arquivo enviado é uma conversa */}
      <section className="grid gap-3" aria-labelledby="conversas">
        <div className="flex items-baseline justify-between">
          <h2 id="conversas" className="text-xl">
            <span className="font-display text-shu mr-2 text-base" lang="ja" title="hanashi, conversa">
              話
            </span>
            Conversas
          </h2>
          <Link href="/adicionar" className="text-shu flex items-center gap-1 text-sm font-bold hover:underline">
            <Plus aria-hidden className="size-4" /> Nova conversa
          </Link>
        </div>
        {!convos?.length ? (
          <Link href="/adicionar" className="stamp-press bg-card flex items-center gap-3 rounded-2xl p-4" data-testid="convo-empty">
            <FilePlus2 aria-hidden className="text-shu size-6 shrink-0" />
            <span>
              <span className="block font-bold">Mande seu primeiro arquivo</span>
              <span className="text-muted-foreground block text-sm">Ele vira uma conversa: pergunte, peça resumo ou questões.</span>
            </span>
          </Link>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="convo-list">
            {convos.map((c) => (
              <li key={c.id}>
                <Link href={`/chat/${c.subject_id}?material=${c.id}`} className="tap-spring bg-card flex items-center gap-3 rounded-2xl border-2 border-ink/20 p-3 hover:border-ink">
                  <span className="bg-pastel-lilac grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink">
                    <MessagesSquare aria-hidden className="size-5" />
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-bold">{c.title}</span>
                    <span className="text-muted-foreground truncate text-xs">{c.subjects?.inbox ? "Sem pasta" : (c.subjects?.name ?? "")}</span>
                  </span>
                  {c.status !== "ready" && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", c.status === "error" ? "bg-destructive/15 text-destructive" : "bg-pastel-peach")}>
                      {c.status === "error" ? "erro" : "lendo..."}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* cadernos: cada matéria é um caderno de selos */}
      <section className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">
            <span className="font-display text-shu mr-2 text-base" lang="ja" title="chō, caderno">
              帳
            </span>
            Suas pastas
          </h2>
          <a href="#nova-materia" className="text-shu flex items-center gap-1 text-sm font-bold hover:underline">
            <Plus aria-hidden className="size-4" /> Nova pasta
          </a>
        </div>
        {!folders.length ? (
          <p className="text-muted-foreground text-sm">Pastas são opcionais: mande um arquivo e organize depois, ou crie uma pasta por matéria.</p>
        ) : (
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-4 md:overflow-visible md:px-0" data-testid="subject-list">
            {folders.map((s, i) => {
              const cover = COVERS[i % COVERS.length];
              const left = s.exam_date ? daysBetween(today, s.exam_date) : null;
              return (
                <li key={s.id} className="w-40 shrink-0 snap-start md:w-44">
                  <Link
                    href={`/subjects/${s.id}`}
                    className={cn(
                      "seigaiha notebook-lift relative grid aspect-[3/4] content-between overflow-hidden rounded-r-2xl rounded-l-md border-2 border-ink p-3 shadow-[3px_4px_0_var(--ink)] hover:shadow-[5px_10px_0_var(--ink)]",
                      cover.bg,
                      cover.text,
                    )}
                  >
                    {/* lombada */}
                    <span aria-hidden className="absolute inset-y-0 left-0 w-2 border-r-2 border-ink/60 bg-black/20" />
                    {/* etiqueta de papel com o nome */}
                    <span className="bg-washi text-ink relative ml-2 grid gap-0.5 rounded-sm border-[1.5px] border-ink px-2.5 py-2 shadow-[0_2px_0_rgb(0_0_0/0.25)]">
                      <span className="font-display line-clamp-3 text-[15px] leading-tight font-extrabold [overflow-wrap:anywhere] hyphens-auto">{s.name}</span>
                      <span className="text-[10px] font-bold tracking-wider text-ink/60 uppercase">
                        {s.inbox ? "arquivos soltos" : (EXAM_STYLE_LABELS[s.exam_style as keyof typeof EXAM_STYLE_LABELS] ?? s.exam_style)}
                      </span>
                    </span>
                    <span className="relative ml-2 flex items-end justify-between">
                      {left != null && left >= 0 ? (
                        <span className="leading-none">
                          <span className="font-display block text-3xl font-extrabold">{left}</span>
                          <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">{left === 1 ? "dia p/ prova" : "dias p/ prova"}</span>
                        </span>
                      ) : (
                        <span className="text-xs opacity-80">{s.inbox ? "organize depois" : "sem data de prova"}</span>
                      )}
                      <Hanko className="size-9 drop-shadow" rotate={8} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              <span className="font-display text-shu text-base" lang="ja" title="yotei, programação">
                予定
              </span>
              Plano de hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Coloque a data da prova numa matéria e o Gabarita monta o que estudar em cada dia.</p>
            ) : (
              <ul className="grid gap-1 text-sm" data-testid="today-tasks">
                {shownTasks.map((t) => (
                  <li key={`${t.subjectId}-${t.id}`}>
                    <Link href={`/subjects/${t.subjectId}/plan`} className="hover:bg-accent flex items-center gap-3 rounded-xl p-2 transition-colors">
                      {t.done ? <Hanko className="size-6" rotate={-8} label="feita" /> : <Circle aria-label="a fazer" className="text-ink/35 size-6 shrink-0" strokeWidth={1.5} />}
                      <span className={cn("flex-1", t.done && "text-muted-foreground line-through")}>
                        {t.title}
                        <span className="text-muted-foreground block text-xs">{t.subject}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {todayTasks.length > shownTasks.length && (
                  <li>
                    <Link href={`/subjects/${todayTasks[0].subjectId}/plan`} className="text-shu px-2 text-xs font-bold hover:underline">
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
              <Link key={s.href} href={s.href} className="stamp-press bg-card grid content-start gap-1 rounded-2xl p-4">
                <Icon aria-hidden className="text-shu size-5" strokeWidth={1.9} />
                <span className="text-sm font-bold">{s.label}</span>
                <span className="text-muted-foreground text-xs leading-snug">{s.text}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Card id="nova-materia" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Nova pasta</CardTitle>
          <p className="text-muted-foreground text-sm">Uma pasta por matéria ou prova. É só dar um nome.</p>
        </CardHeader>
        <CardContent>
          <CreateSubjectForm />
        </CardContent>
      </Card>
    </div>
  );
}

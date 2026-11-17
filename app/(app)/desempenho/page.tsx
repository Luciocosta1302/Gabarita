import Link from "next/link";

import { BarChart, LineChart } from "@/components/performance/charts";
import { Counter } from "@/components/ui/counter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, todayBR } from "@/lib/dates";
import { focusStats } from "@/lib/focus/stats";
import { recommendations, weeklySeries } from "@/lib/performance/stats";
import { confidenceStats } from "@/lib/quiz/confidence";
import { createClient } from "@/lib/supabase/server";
import { loadTopicStats } from "@/lib/topics/stats";

export const metadata = { title: "Desempenho — Gabarita" };

const WEEKS = 8;

export default async function PerformancePage() {
  const supabase = await createClient();
  const today = todayBR();
  const since = addDays(today, -7 * WEEKS);
  const [{ data: attempts }, { count: totalAnswered }, focus, { data: subjects }, { count: due }, { data: planDays }] = await Promise.all([
    supabase
      .from("attempts")
      .select("correct, confidence, created_at, questions!inner(subject_id)")
      .gte("created_at", `${since}T00:00:00-03:00`)
      .limit(20000),
    supabase.from("attempts").select("id", { count: "exact", head: true }),
    focusStats(supabase, today),
    supabase.from("subjects").select("id, name").order("created_at", { ascending: false }).limit(12),
    supabase.from("reviews").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
    supabase.from("plan_days").select("tasks_json").eq("date", today),
  ]);
  const all = attempts ?? [];
  const correct = all.filter((a) => a.correct).length;
  const series = weeklySeries(all, today, WEEKS);
  const label = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const conf = confidenceStats(all);
  const sure = conf.find((c) => c.level === "certeza")!;

  const perSubject = (subjects ?? []).map((s) => {
    const xs = all.filter((a) => a.questions.subject_id === s.id);
    return { ...s, answered: xs.length, accuracy: xs.length ? xs.filter((a) => a.correct).length / xs.length : null };
  });
  const topicStats = (await Promise.all((subjects ?? []).map(async (s) => (await loadTopicStats(supabase, s.id)).map((t) => ({ ...t, subjectId: s.id }))))).flat();
  const weak = topicStats
    .filter((t) => t.mastery != null)
    .sort((a, b) => a.mastery! - b.mastery!)
    .filter((t) => t.mastery! < 0.7)
    .map((t) => ({ name: t.name, subjectId: t.subjectId, mastery: t.mastery! }));
  const dist = {
    fraco: topicStats.filter((t) => t.mastery != null && t.mastery < 0.4).length,
    progresso: topicStats.filter((t) => t.mastery != null && t.mastery >= 0.4 && t.mastery < 0.7).length,
    dominado: topicStats.filter((t) => t.mastery != null && t.mastery >= 0.7).length,
    semDados: topicStats.filter((t) => t.mastery == null).length,
  };
  const pendingToday = (planDays ?? []).flatMap((d) => (d.tasks_json as { done?: boolean }[]) ?? []).filter((t) => !t.done).length;
  const recs = recommendations({
    weakTopics: weak,
    dueReviews: due ?? 0,
    pendingToday,
    sureWrongRate: sure.wrongRate,
    sureTotal: sure.total,
    answered: totalAnswered ?? 0,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Desempenho</h1>
        <p className="text-muted-foreground text-sm">Sua evolução nas últimas {WEEKS} semanas e o que fazer agora.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="perf-tiles">
        <Tile label="Questões respondidas" num={totalAnswered ?? 0} />
        <Tile label={`Aproveitamento (${WEEKS} sem.)`} num={all.length ? Math.round((correct / all.length) * 100) : null} suffix="%" />
        <Tile label="Tempo de foco" num={Math.round(focus.totalMinutes / 60)} suffix=" h" />
        <Tile label="Sequência" num={focus.streak} suffix={focus.streak === 1 ? " dia" : " dias"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>O que fazer agora</CardTitle>
        </CardHeader>
        <CardContent>
          {recs.length === 0 ? (
            <p className="text-sm">Tudo em dia. Que tal um simulado?</p>
          ) : (
            <ul className="grid gap-2 text-sm" data-testid="recommendations">
              {recs.map((r, i) => (
                <li key={i}>
                  <Link href={r.href} className="bg-pastel-lilac/50 hover:bg-pastel-lilac block rounded-xl px-3 py-2">
                    {r.text} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <BarChart
              title="Questões respondidas por semana"
              unit="Questões"
              points={series.map((w) => ({ label: label(w.weekStart), value: w.answered, detail: `${w.answered} ${w.answered === 1 ? "questão" : "questões"}` }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <LineChart
              title="Aproveitamento por semana"
              unit="Acertos"
              points={series.map((w) => ({
                label: label(w.weekStart),
                value: w.accuracy == null ? null : Math.round(w.accuracy * 100),
                detail: w.accuracy == null ? "sem respostas" : `${Math.round(w.accuracy * 100)}% (${w.correct} de ${w.answered})`,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por matéria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm" data-testid="perf-subjects">
              {perSubject.map((s) => (
                <li key={s.id} className="grid gap-1">
                  <span className="flex justify-between">
                    <Link href={`/subjects/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-muted-foreground">{s.accuracy == null ? "sem respostas" : `${Math.round(s.accuracy * 100)}% · ${s.answered} questões`}</span>
                  </span>
                  <span className="bg-muted h-2 overflow-hidden rounded-full">
                    <span className="bg-primary block h-full rounded-r" style={{ width: `${Math.round((s.accuracy ?? 0) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Domínio dos tópicos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Chip tone="bg-pastel-mint" label="Dominados" value={dist.dominado} />
              <Chip tone="bg-pastel-peach" label="Em progresso" value={dist.progresso} />
              <Chip tone="bg-pastel-rose" label="Fracos" value={dist.fraco} />
              <Chip tone="bg-muted" label="Sem dados" value={dist.semDados} />
            </div>
            {sure.total > 0 && (
              <p>
                Falsa certeza: quando marca &quot;tenho certeza&quot;, você erra <strong>{Math.round((sure.wrongRate ?? 0) * 100)}%</strong> ({sure.total - sure.correct} de {sure.total}).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Tile({ label, num, suffix = "" }: { label: string; num: number | null; suffix?: string }) {
  return (
    <div className="bg-card rounded-2xl border-[1.5px] border-ink/80 p-4 shadow-[0_3px_0_rgb(31_26_23/0.12)]">
      <div className="eyebrow">{label}</div>
      <div className="font-display mt-1 text-3xl font-extrabold">
        {num == null ? "—" : <Counter value={num} />}
        <span className="text-muted-foreground font-sans text-base font-bold">{num == null ? "" : suffix}</span>
      </div>
    </div>
  );
}

function Chip({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <div className={`${tone} rounded-xl p-3`}>
      <div className="text-xs">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}

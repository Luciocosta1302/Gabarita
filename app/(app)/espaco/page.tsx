import { StudySpace } from "@/components/focus/study-space";
import { TIME_ZONE, todayBR } from "@/lib/dates";
import { timeOfDay } from "@/lib/focus/scenes";
import { focusStats } from "@/lib/focus/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Espaço de estudos — Gabarita" };

export default async function StudySpacePage() {
  const supabase = await createClient();
  const today = todayBR();
  const [stats, { data: planDays }, { data: subjects }] = await Promise.all([
    focusStats(supabase, today),
    supabase.from("plan_days").select("tasks_json, study_plans!inner(subjects(name))").eq("date", today),
    supabase.from("subjects").select("id, name").order("created_at", { ascending: false }),
  ]);
  const planTasks = (planDays ?? []).flatMap((d) =>
    ((d.tasks_json ?? []) as { title: string; done?: boolean; kind?: string }[])
      .filter((t) => !t.done && t.kind !== "review")
      .map((t) => ({ title: t.title, subject: d.study_plans.subjects?.name ?? "" })),
  );
  const hourBR = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hour12: false }).format(new Date())) % 24;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Meu espaço de estudos</h1>
        <p className="text-muted-foreground text-sm">
          Pomodoro, música lo-fi e chuva para focar. O cenário acompanha o horário, e novos lugares abrem conforme você
          acumula tempo de foco.
        </p>
      </div>
      <StudySpace initialStats={stats} planTasks={planTasks} subjects={subjects ?? []} today={today} initialTod={timeOfDay(hourBR)} />
    </div>
  );
}

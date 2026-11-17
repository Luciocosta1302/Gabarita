import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PlanSetupForm } from "@/components/plan/plan-setup-form";
import { PlanView } from "@/components/plan/plan-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysBetween, todayBR } from "@/lib/dates";
import { createPlan, getPlan } from "@/lib/planner/service";
import { createClient, getUser } from "@/lib/supabase/server";
import { ToolGuide } from "@/components/tutorials/tutorials";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user } = await getUser();
  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("id, name, exam_date, hours_per_day").eq("id", id).maybeSingle();
  if (!subject || !user) notFound();
  const today = todayBR();

  const back = (
    <Link href={`/subjects/${id}`} className="text-muted-foreground text-sm hover:underline">
      ← {subject.name}
    </Link>
  );

  if (!subject.exam_date || subject.exam_date <= today) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <h1 className="text-3xl font-bold">Plano até a prova</h1>
        <Card>
          <CardHeader>
            <CardTitle>{subject.exam_date ? "A data da prova já passou" : "Quando é a prova?"}</CardTitle>
            <p className="text-muted-foreground text-sm">
              Informe a data e quantas horas por dia você pode estudar. O Gabarita monta o plano de hoje até a véspera e
              se reorganiza sozinho se você perder um dia.
            </p>
          </CardHeader>
          <CardContent>
            <PlanSetupForm subjectId={id} hoursPerDay={subject.hours_per_day} />
          </CardContent>
        </Card>
      </div>
    );
  }

  let plan = await getPlan(supabase, id, today);
  if (!plan) {
    await createPlan(supabase, user.id, id, today);
    plan = await getPlan(supabase, id, today);
  }
  const days = plan?.days ?? [];
  const tasks = days.flatMap((d) => d.tasks);
  const done = tasks.filter((t) => t.done).length;
  const left = daysBetween(today, subject.exam_date);
  const generic = !tasks.some((t) => t.topic_id);

  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="bg-card seigaiha-ink animate-rise rounded-3xl border-2 border-ink p-6 shadow-[0_4px_0_var(--ink)]">
        <h1 className="text-3xl font-bold">Plano até a prova</h1>
        <p className="text-lg" data-testid="plan-countdown">
          Faltam <strong>{left}</strong> {left === 1 ? "dia" : "dias"} · prova em {subject.exam_date.split("-").reverse().join("/")}
        </p>
        <p className="text-foreground/75 text-sm">
          {done} de {tasks.length} tarefas feitas · {Number(subject.hours_per_day ?? 2)} h por dia
        </p>
        {generic && (
          <p className="mt-2 text-sm">
            Este plano ainda é genérico. Quando você enviar o material, ele é refeito por tópico.
          </p>
        )}
      </div>

      <ToolGuide id="plano" />

      <PlanView subjectId={id} days={days} today={today} />

      <details className="bg-card rounded-2xl border p-4">
        <summary className="cursor-pointer font-medium">Mudar data da prova ou horas por dia</summary>
        <div className="mt-4">
          <PlanSetupForm subjectId={id} examDate={subject.exam_date} hoursPerDay={subject.hours_per_day} submitLabel="Refazer plano" />
        </div>
      </details>
    </div>
  );
}

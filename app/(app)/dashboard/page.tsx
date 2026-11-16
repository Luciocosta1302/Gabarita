import Link from "next/link";

import { CreateSubjectForm } from "@/components/subjects/create-subject-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markSeen, newAchievements } from "@/lib/achievements/load";
import { createClient } from "@/lib/supabase/server";
import { todayBR } from "@/lib/dates";
import { EXAM_STYLE_LABELS } from "@/lib/exam-styles";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("name").maybeSingle();
  const firstName = profile?.name?.split(" ")[0];
  const today = todayBR();
  const [{ data: planDays }, { count: dueReviews }] = await Promise.all([
    supabase.from("plan_days").select("date, tasks_json, study_plans!inner(subject_id, subjects(name))").eq("date", today),
    supabase.from("reviews").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
  ]);
  const todayTasks = (planDays ?? []).flatMap((d) =>
    ((d.tasks_json ?? []) as { id: string; title: string; done?: boolean }[]).map((t) => ({
      ...t,
      subjectId: d.study_plans.subject_id,
      subject: d.study_plans.subjects?.name ?? "",
    })),
  );
  // conquistas novas: anuncia uma vez e marca como vistas
  const fresh = await newAchievements(supabase);
  await markSeen(supabase, fresh.map((b) => b.id));
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_date, exam_style")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <section className="animate-rise from-pastel-rose via-pastel-peach to-pastel-lilac rounded-3xl bg-gradient-to-br p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-bold">{firstName ? `Olá, ${firstName}!` : "Olá!"}</h1>
        <p className="font-display text-xl">Vamos estudar hoje?</p>
        <p className="text-foreground/75 mt-2 max-w-md text-sm">
          Mande seu material, gere questões com fonte e descubra o que você ainda não sabe.
        </p>
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

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Seu plano de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Crie uma matéria com data de prova para ganhar um plano diário.</p>
            ) : (
              <ul className="grid gap-1.5 text-sm" data-testid="today-tasks">
                {todayTasks.map((t) => (
                  <li key={`${t.subjectId}-${t.id}`} className="flex items-center gap-2">
                    <span aria-hidden>{t.done ? "☑" : "☐"}</span>
                    <Link href={`/subjects/${t.subjectId}/plan`} className={t.done ? "text-muted-foreground line-through" : "hover:underline"}>
                      {t.title}
                    </Link>
                    <span className="text-muted-foreground text-xs">· {t.subject}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Link href="/review" className="bg-pastel-mint grid content-center gap-1 rounded-2xl p-5 shadow-sm transition-transform hover:-translate-y-0.5">
          <span className="font-semibold">Revisar hoje →</span>
          <span className="font-display text-3xl font-bold" data-testid="due-count">
            {dueReviews ?? 0}
          </span>
          <span className="text-foreground/75 text-xs">{dueReviews === 1 ? "item para revisar" : "itens para revisar"}</span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova matéria</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSubjectForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Suas matérias</h2>
        {!subjects?.length ? (
          <p className="text-muted-foreground text-sm">Nenhuma matéria ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="subject-list">
            {subjects.map((s) => (
              <li key={s.id}>
                <Link href={`/subjects/${s.id}`} className="bg-card hover:bg-accent block rounded-xl border p-3 transition-colors">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground block text-sm">
                    {EXAM_STYLE_LABELS[s.exam_style as keyof typeof EXAM_STYLE_LABELS] ?? s.exam_style}
                    {s.exam_date && ` · prova em ${formatDate(s.exam_date)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

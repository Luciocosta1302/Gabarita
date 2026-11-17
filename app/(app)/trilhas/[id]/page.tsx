import { Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { pathProgress, STREAK_TO_PASS, type StepStatus } from "@/lib/paths/logic";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const LEVEL_LABEL = { basico: "básico", intermediario: "intermediário", avancado: "avançado" } as const;

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: path } = await supabase
    .from("learning_paths")
    .select("id, title, goal, subject_id, subjects(name)")
    .eq("id", id)
    .maybeSingle();
  if (!path) notFound();
  const [{ data: steps }, { data: topics }] = await Promise.all([
    supabase.from("path_steps").select("*").eq("path_id", id).order("position"),
    supabase.from("topics").select("id, name").eq("subject_id", path.subject_id),
  ]);
  const topicName = new Map((topics ?? []).map((t) => [t.id, t.name]));
  const prog = pathProgress((steps ?? []).map((s) => ({ status: s.status as StepStatus })));
  const titleAt = new Map((steps ?? []).map((s) => [s.position, s.title]));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/trilhas" className="text-muted-foreground text-sm hover:underline">
        ← Trilhas
      </Link>
      <div className="bg-ai seigaiha animate-rise rounded-3xl border-2 border-ink p-6 text-washi shadow-[0_4px_0_var(--ink)]">
        <h1 className="text-3xl font-bold">{path.title}</h1>
        <p className="text-sm opacity-90">
          {path.subjects?.name} · objetivo: {path.goal}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
          <div className="h-full bg-white" style={{ width: `${prog.percent}%` }} />
        </div>
        <p className="mt-1 text-xs opacity-90">
          {prog.done} de {prog.total} etapas concluídas
        </p>
      </div>

      <ol className="relative grid gap-6" data-testid="path-steps">
        {/* caminho tracejado ligando as etapas */}
        <div aria-hidden className="border-primary/30 absolute top-6 bottom-6 left-6 border-l-2 border-dashed sm:left-1/2" />
        {(steps ?? []).map((s, i) => {
          const status = s.status as StepStatus;
          const open = status !== "locked";
          const right = i % 2 === 1;
          const card = (
            <div
              className={cn(
                "grid gap-1 rounded-2xl border p-4 shadow-sm transition-transform",
                status === "done" && "bg-pastel-mint",
                status === "in_progress" && "bg-pastel-peach",
                status === "available" && "bg-card border-primary ring-primary/20 ring-2",
                status === "locked" && "bg-muted opacity-70",
                open && "hover:-translate-y-0.5",
              )}
            >
              <span className="text-muted-foreground text-xs">
                Etapa {s.position} · {LEVEL_LABEL[s.level as keyof typeof LEVEL_LABEL]}
              </span>
              <span className="font-semibold">{s.title}</span>
              <span className="text-foreground/80 text-sm">{s.objective}</span>
              <span className="text-muted-foreground text-xs">{s.topic_ids.map((t) => topicName.get(t)).filter(Boolean).join(" · ")}</span>
              {status === "in_progress" && (
                <span className="text-xs">
                  Acertos seguidos: {"●".repeat(s.correct_streak)}
                  {"○".repeat(Math.max(0, STREAK_TO_PASS - s.correct_streak))}
                </span>
              )}
              {status === "locked" && s.prerequisites.length > 0 && (
                <span className="text-xs">Depois de: {s.prerequisites.map((p) => titleAt.get(p) ?? `etapa ${p}`).join(", ")}</span>
              )}
            </div>
          );
          return (
            <li key={s.id} data-testid="path-step" data-status={status} className="relative grid grid-cols-[3rem_1fr] items-center gap-3 sm:grid-cols-[1fr_3rem_1fr]">
              <div className={cn("hidden sm:block", right && "sm:invisible")}>{!right && (open ? <Link href={`/trilhas/${id}/etapa/${s.id}`}>{card}</Link> : card)}</div>
              <div
                className={cn(
                  "z-10 grid size-12 place-items-center rounded-full border-2 text-lg font-bold shadow-sm",
                  status === "done" && "bg-success border-success text-white",
                  status === "in_progress" && "bg-pastel-peach border-primary",
                  status === "available" && "bg-card border-primary animate-pulse",
                  status === "locked" && "bg-muted border-border text-muted-foreground",
                )}
                aria-label={status === "done" ? "concluída" : status === "locked" ? "trancada" : "liberada"}
              >
                {status === "done" ? "✓" : status === "locked" ? <Lock aria-label="trancada" className="size-4" /> : s.position}
              </div>
              <div className={cn(!right && "sm:invisible")}>
                {/* no celular o card fica sempre à direita da bolinha */}
                <div className={cn(!right && "sm:hidden")}>{open ? <Link href={`/trilhas/${id}/etapa/${s.id}`}>{card}</Link> : card}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

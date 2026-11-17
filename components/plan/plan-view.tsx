"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { petals } from "@/lib/feedback/celebrate";
import { play } from "@/lib/feedback/sound";
import { shortDateBR } from "@/lib/dates";
import type { PlanDay, PlanTask } from "@/lib/planner/plan";
import { cn } from "@/lib/utils";

const STATUS_LABEL = { pending: "", done: "✓ Concluído", missed: "Não feito" } as const;

export function PlanView({ subjectId, days, today }: { subjectId: string; days: PlanDay[]; today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(key: string, body: Record<string, unknown>, then?: (r: unknown) => void) {
    setBusy(key);
    setError(null);
    try {
      const r = await postJSON("/api/plan", { subject_id: subjectId, ...body });
      then?.(r);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(null);
    }
  }

  async function practice(task: PlanTask) {
    setBusy(task.id);
    setError(null);
    try {
      const r = await postJSON<{ quiz_id: string }>("/api/generate/questions", {
        subject_id: subjectId,
        topic_id: task.topic_id ?? undefined,
        count: task.count ?? 10,
        mode: task.kind === "simulado" ? "simulado" : "pratica",
      });
      router.push(`/quiz/${r.quiz_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar questões.");
      setBusy(null);
    }
  }

  function action(day: PlanDay, t: PlanTask) {
    if (t.done || day.status === "missed") return null;
    if (t.kind === "questions" || t.kind === "revisit" || t.kind === "simulado")
      return (
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => practice(t)}>
          {busy === t.id ? "Gerando..." : "Fazer agora"}
        </Button>
      );
    if (t.kind === "review")
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/review?subject=${subjectId}`}>Revisar</Link>
        </Button>
      );
    if (t.kind === "upload" || t.kind === "study" || t.kind === "weak")
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/subjects/${subjectId}${t.kind === "weak" ? "#dominio" : ""}`}>Abrir</Link>
        </Button>
      );
    return null;
  }

  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <ol className="grid gap-3" data-testid="plan-days">
        {days.map((day) => {
          const isToday = day.date === today;
          const canClose = day.date <= today && day.status === "pending";
          const minutes = day.tasks.filter((t) => !t.done).reduce((s, t) => s + t.minutes, 0);
          return (
            <li
              key={day.date}
              data-testid="plan-day"
              data-date={day.date}
              data-status={day.status}
              className={cn(
                "bg-card grid gap-3 rounded-2xl border p-4 shadow-sm",
                isToday && "border-primary ring-primary/20 ring-2",
                day.status === "missed" && "opacity-70",
                day.status === "done" && "bg-pastel-mint/50",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {isToday ? "Hoje · " : ""}
                  {shortDateBR(day.date)}
                  {day.status !== "pending" && (
                    <span className="text-muted-foreground ml-2 text-xs font-normal">{STATUS_LABEL[day.status]}</span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">{minutes > 0 ? `~${minutes} min` : ""}</span>
              </div>

              <ul className="grid gap-2">
                {day.tasks.map((t) => (
                  <li key={t.id} data-testid="plan-task" data-kind={t.kind} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Feito: ${t.title}`}
                      checked={!!t.done}
                      disabled={!!busy || day.status === "missed"}
                      onChange={(e) => {
                        if (e.target.checked) {
                          play("stamp");
                          petals(e.target, 8);
                        } else play("tap");
                        act(t.id, { action: "task", date: day.date, task_id: t.id, done: e.target.checked });
                      }}
                      className="accent-primary size-4"
                    />
                    <span className={cn("flex-1", t.done && "text-muted-foreground line-through")}>
                      {t.title}
                      <span className="text-muted-foreground ml-1 text-xs">· {t.minutes} min</span>
                      {t.moved_from && (
                        <span className="bg-pastel-peach ml-2 rounded-full px-2 py-0.5 text-xs">veio de {shortDateBR(t.moved_from)}</span>
                      )}
                    </span>
                    {action(day, t)}
                  </li>
                ))}
              </ul>

              {canClose && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!!busy} onClick={(e) => {
                    play("complete");
                    petals(e.currentTarget, 18);
                    act(`done-${day.date}`, { action: "done", date: day.date });
                  }}>
                    Concluí o dia
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => act(`missed-${day.date}`, { action: "missed", date: day.date })}
                  >
                    {busy === `missed-${day.date}` ? "Reorganizando..." : "Não fiz este dia"}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

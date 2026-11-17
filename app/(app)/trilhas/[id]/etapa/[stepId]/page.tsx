import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TutorSession, type TutorMessage } from "@/components/paths/tutor-session";
import { STREAK_TO_PASS } from "@/lib/paths/logic";
import { createClient } from "@/lib/supabase/server";
import { ToolGuide } from "@/components/tutorials/tutorials";

export default async function StepPage({ params }: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(stepId).success) notFound();
  const supabase = await createClient();
  const { data: step } = await supabase.from("path_steps").select("*, learning_paths(title)").eq("id", stepId).eq("path_id", id).maybeSingle();
  if (!step) notFound();

  const back = (
    <Link href={`/trilhas/${id}`} className="text-muted-foreground text-sm hover:underline">
      ← {step.learning_paths?.title ?? "Trilha"}
    </Link>
  );
  if (step.status === "locked") {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="bg-muted rounded-2xl p-6">Esta etapa abre quando você concluir as anteriores.</p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("tutor_messages")
    .select("id, role, kind, content_json, question_id")
    .eq("step_id", stepId)
    .order("created_at");
  const qIds = (rows ?? []).map((r) => r.question_id).filter((q): q is string => !!q);
  // só enunciado e alternativas: o gabarito não vai para o navegador
  const { data: qs } = qIds.length ? await supabase.from("questions").select("id, stem, options_json").in("id", qIds) : { data: [] };
  const qById = new Map((qs ?? []).map((q) => [q.id, { id: q.id, stem: q.stem, options: (q.options_json as string[]) ?? [] }]));
  const messages: TutorMessage[] = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role as TutorMessage["role"],
    kind: r.kind as TutorMessage["kind"],
    content: r.content_json as Record<string, unknown>,
    question: r.question_id ? (qById.get(r.question_id) ?? null) : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      {back}
      <div className="bg-pastel-lilac animate-rise grid gap-1 rounded-2xl p-5">
        <span className="text-muted-foreground text-xs">Etapa {step.position}</span>
        <h1 className="text-2xl font-bold">{step.title}</h1>
        <p className="text-sm"><strong>Objetivo:</strong> {step.objective}</p>
        <p className="text-xs" data-testid="step-streak">
          {step.status === "done"
            ? "✓ Concluída"
            : `Acertos seguidos: ${"●".repeat(step.correct_streak)}${"○".repeat(Math.max(0, STREAK_TO_PASS - step.correct_streak))} (${STREAK_TO_PASS} para concluir)`}
        </p>
      </div>
      <ToolGuide id="tutor" />
      <TutorSession stepId={stepId} messages={messages} status={step.status} nextStepHref={`/trilhas/${id}`} />
    </div>
  );
}

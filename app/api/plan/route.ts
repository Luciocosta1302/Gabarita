import { NextResponse } from "next/server";

import { apiRoute, jsonError } from "@/lib/api/route";
import { todayBR } from "@/lib/dates";
import { markDone, markMissed, toggleTask } from "@/lib/planner/plan";
import { createPlan, refreshPlan, updateDays } from "@/lib/planner/service";
import { planActionSchema } from "@/lib/validation/generate";

/** D2 — ações do plano: configurar data/horas, concluir dia, "não fiz" (redistribui), marcar tarefa, refazer. */
export const POST = apiRoute(planActionSchema, async (input, { supabase, user }) => {
  const { data: subject } = await supabase.from("subjects").select("id").eq("id", input.subject_id).maybeSingle();
  if (!subject) return jsonError("Matéria não encontrada.", 404);
  const today = todayBR();

  switch (input.action) {
    case "setup": {
      if (input.exam_date <= today) return jsonError("A data da prova precisa ser depois de hoje.", 400);
      const { error } = await supabase
        .from("subjects")
        .update({ exam_date: input.exam_date, hours_per_day: input.hours_per_day })
        .eq("id", input.subject_id);
      if (error) throw error;
      await createPlan(supabase, user.id, input.subject_id, today);
      break;
    }
    case "refresh":
      await refreshPlan(supabase, user.id, input.subject_id, today);
      break;
    case "missed":
      if (input.date > today) return jsonError("Só dá para marcar como não feito hoje ou um dia que já passou.", 400);
      await updateDays(supabase, input.subject_id, (p) => markMissed(p.days, input.date, p.minutesPerDay));
      break;
    case "done":
      if (input.date > today) return jsonError("Esse dia ainda não chegou.", 400);
      await updateDays(supabase, input.subject_id, (p) => markDone(p.days, input.date));
      break;
    case "task":
      await updateDays(supabase, input.subject_id, (p) => toggleTask(p.days, input.date, input.task_id, input.done));
      break;
  }
  return NextResponse.json({ ok: true });
});

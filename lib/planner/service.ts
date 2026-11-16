import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayBR } from "@/lib/dates";
import type { Database, Json } from "@/lib/supabase/database.types";
import { loadTopicStats } from "@/lib/topics/stats";

import { autoReplan, buildPlan, regenerateFrom, type PlanDay, type PlanInput, type PlanTask } from "./plan";

type DB = SupabaseClient<Database>;

export const DEFAULT_HOURS_PER_DAY = 2;

export type StoredPlan = { planId: string; minutesPerDay: number; examDate: string; days: PlanDay[] };

async function planInput(db: DB, subjectId: string, today: string): Promise<PlanInput | null> {
  const { data: s } = await db.from("subjects").select("exam_date, hours_per_day").eq("id", subjectId).maybeSingle();
  if (!s?.exam_date) return null;
  const stats = await loadTopicStats(db, subjectId);
  return {
    today,
    examDate: s.exam_date,
    minutesPerDay: Math.round(Number(s.hours_per_day ?? DEFAULT_HOURS_PER_DAY) * 60),
    topics: stats.filter((t) => t.chunks > 0).map((t) => ({ id: t.id, name: t.name, weight: t.chunks, mastery: t.mastery })),
  };
}

async function saveDays(db: DB, userId: string, planId: string, days: PlanDay[], replaceFrom?: string) {
  if (replaceFrom) await db.from("plan_days").delete().eq("plan_id", planId).gte("date", replaceFrom);
  if (!days.length) return;
  const { error } = await db.from("plan_days").upsert(
    days.map((d) => ({
      user_id: userId,
      plan_id: planId,
      date: d.date,
      status: d.status,
      done: d.status === "done",
      tasks_json: d.tasks as unknown as NonNullable<Json>,
    })),
    { onConflict: "plan_id,date" },
  );
  if (error) throw error;
}

async function readDays(db: DB, planId: string): Promise<PlanDay[]> {
  const { data } = await db.from("plan_days").select("date, status, tasks_json").eq("plan_id", planId).order("date");
  return (data ?? []).map((d) => ({ date: d.date, status: d.status as PlanDay["status"], tasks: d.tasks_json as unknown as PlanTask[] }));
}

/** Cria o plano da matéria (se tiver data de prova), substituindo um anterior. */
export async function createPlan(db: DB, userId: string, subjectId: string, today = todayBR()) {
  const input = await planInput(db, subjectId, today);
  if (!input) return null;
  await db.from("study_plans").delete().eq("subject_id", subjectId);
  const { data: plan, error } = await db
    .from("study_plans")
    .insert({ user_id: userId, subject_id: subjectId, params_json: { exam_date: input.examDate, minutes_per_day: input.minutesPerDay } })
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("Falha ao criar o plano");
  await saveDays(db, userId, plan.id, buildPlan(input));
  return plan.id;
}

/**
 * Lê o plano. Se dias passaram sem ser concluídos, eles viram "não feitos" e as tarefas
 * se redistribuem sozinhas (e isso é salvo).
 */
export async function getPlan(db: DB, subjectId: string, today = todayBR()): Promise<StoredPlan | null> {
  const { data: plan } = await db.from("study_plans").select("id, user_id, params_json").eq("subject_id", subjectId).maybeSingle();
  if (!plan) return null;
  const params = plan.params_json as { exam_date: string; minutes_per_day: number };
  const days = await readDays(db, plan.id);
  const { days: replanned, changed } = autoReplan(days, today, params.minutes_per_day);
  if (changed) await saveDays(db, plan.user_id, plan.id, replanned);
  return { planId: plan.id, minutesPerDay: params.minutes_per_day, examDate: params.exam_date, days: replanned };
}

export async function updateDays(db: DB, subjectId: string, change: (p: StoredPlan) => PlanDay[]) {
  const plan = await getPlan(db, subjectId);
  if (!plan) return null;
  const days = change(plan);
  const { data: owner } = await db.from("study_plans").select("user_id").eq("id", plan.planId).single();
  await saveDays(db, owner!.user_id, plan.planId, days);
  return { ...plan, days };
}

/**
 * Refaz os dias de hoje em diante (ex.: chegaram os tópicos de um material novo).
 * Mantém o passado e o que já foi feito hoje. Cria o plano se ainda não existir.
 */
export async function refreshPlan(db: DB, userId: string, subjectId: string, today = todayBR()) {
  const plan = await getPlan(db, subjectId, today);
  if (!plan) return createPlan(db, userId, subjectId, today);
  const input = await planInput(db, subjectId, today);
  if (!input) return null;
  const days = regenerateFrom(plan.days, input);
  await saveDays(db, userId, plan.planId, days.filter((d) => d.date >= today), today);
  await db.from("study_plans").update({ params_json: { exam_date: input.examDate, minutes_per_day: input.minutesPerDay } }).eq("id", plan.planId);
  return plan.planId;
}

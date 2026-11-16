import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { UserFacingError } from "@/lib/errors";
import { TIME_ZONE, todayBR } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

import { FREE_LIMITS, isPro, PRO_FEATURE_LABELS, type ProFeature } from "./plan";

type DB = SupabaseClient<Database>;

/** Erro de limite do plano: a API responde 402 e a tela mostra o link para os planos. */
export class PlanLimitError extends UserFacingError {
  readonly upgrade = true;
}

/** Início do dia/mês de hoje em São Paulo, como instante UTC. */
function startOf(kind: "day" | "month", now = new Date()) {
  const today = todayBR(now);
  const date = kind === "day" ? today : `${today.slice(0, 7)}-01`;
  // offset de São Paulo no dia (sem horário de verão desde 2019, mas calculado para não depender disso)
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  const sign = offset.startsWith("-") ? "-" : "+";
  const hours = offset.replace(/^[+-]/, "").padStart(2, "0") || "00";
  return new Date(`${date}T00:00:00${sign}${hours.length <= 2 ? `${hours}:00` : hours}`).toISOString();
}

export async function loadPlan(db: DB, userId: string) {
  const { data } = await db.from("profiles").select("plan, pro_until").eq("id", userId).maybeSingle();
  return { pro: isPro(data), proUntil: data?.pro_until ?? null };
}

export async function usage(db: DB, userId: string) {
  const [{ count: materials }, { count: questions }] = await Promise.all([
    db
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("type", "past_exam")
      .gte("created_at", startOf("month")),
    db
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("origin", ["quiz", "tutor"])
      .gte("created_at", startOf("day")),
  ]);
  return { materialsThisMonth: materials ?? 0, questionsToday: questions ?? 0 };
}

/** Grátis: 2 materiais por mês (provas antigas não contam; são do Pro). */
export async function assertCanAddMaterial(db: DB, userId: string) {
  if ((await loadPlan(db, userId)).pro) return;
  const u = await usage(db, userId);
  if (u.materialsThisMonth >= FREE_LIMITS.materialsPerMonth) {
    throw new PlanLimitError(
      `No plano grátis são ${FREE_LIMITS.materialsPerMonth} materiais por mês. Assine o Pro (em Planos) para enviar sem limite.`,
    );
  }
}

/** Grátis: 30 questões geradas por dia. */
export async function assertQuestionQuota(db: DB, userId: string, wanted: number) {
  if ((await loadPlan(db, userId)).pro) return;
  const u = await usage(db, userId);
  const left = FREE_LIMITS.questionsPerDay - u.questionsToday;
  if (left <= 0) {
    throw new PlanLimitError(`Você usou as ${FREE_LIMITS.questionsPerDay} questões grátis de hoje. Amanhã tem mais — ou assine o Pro (em Planos).`);
  }
  if (wanted > left) throw new PlanLimitError(`Hoje você ainda pode gerar ${left} ${left === 1 ? "questão" : "questões"} no plano grátis.`);
}

export async function assertPro(db: DB, userId: string, feature: ProFeature) {
  if ((await loadPlan(db, userId)).pro) return;
  throw new PlanLimitError(`${PRO_FEATURE_LABELS[feature]} é do plano Pro. Veja em Planos.`);
}

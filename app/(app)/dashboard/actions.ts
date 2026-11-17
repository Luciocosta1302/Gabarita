"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createPlan } from "@/lib/planner/service";
import { getUser } from "@/lib/supabase/server";
import { createSubjectSchema } from "@/lib/validation/subject";

export type CreateSubjectState = { error?: string; ok?: boolean };

export async function createSubject(_prev: CreateSubjectState, formData: FormData): Promise<CreateSubjectState> {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Faça login de novo." };

  const parsed = createSubjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields = Object.values(z.flattenError(parsed.error).fieldErrors) as (string[] | undefined)[];
    return { error: fields.find((m) => m?.length)?.[0] ?? "Dados inválidos" };
  }

  const { data: created, error } = await supabase
    .from("subjects")
    .insert({
    user_id: user.id,
    name: parsed.data.name,
    exam_date: parsed.data.exam_date ?? null,
    hours_per_day: parsed.data.hours_per_day ?? null,
    exam_style: parsed.data.exam_style,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Não foi possível criar a matéria." };

  // D2: com data de prova, o plano reverso já nasce (genérico até chegar o material).
  if (parsed.data.exam_date) {
    try {
      await createPlan(supabase, user.id, created.id);
    } catch (e) {
      console.error("[plano] falha ao criar:", e);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/adicionar");
  return { ok: true };
}

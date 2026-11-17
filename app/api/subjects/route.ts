import { NextResponse } from "next/server";

import { INBOX_NAME } from "@/lib/folders/folders";
import { apiRoute, jsonError } from "@/lib/api/route";
import { todayBR } from "@/lib/dates";
import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import { refreshPlan } from "@/lib/planner/service";
import { subjectActionSchema } from "@/lib/validation/subject";

/** Editar a matéria (nome, data da prova, horas/dia, banca) ou apagá-la com tudo o que tem dentro. */
export const POST = apiRoute(subjectActionSchema, async (input, { supabase, user }) => {
  const { data: subject } = await supabase.from("subjects").select("id, exam_date, hours_per_day, inbox").eq("id", input.subject_id).maybeSingle();
  if (!subject) return jsonError("Pasta não encontrada. Recarregue a página.", 404);
  const today = todayBR();

  if (input.action === "delete") {
    // arquivos no Storage não somem em cascata: apaga as pastas dos materiais
    const { data: mats } = await supabase.from("materials").select("storage_path").eq("subject_id", input.subject_id);
    for (const m of mats ?? []) {
      if (!m.storage_path) continue;
      const { data: files } = await supabase.storage.from(MATERIALS_BUCKET).list(m.storage_path);
      if (files?.length) await supabase.storage.from(MATERIALS_BUCKET).remove(files.map((f) => `${m.storage_path}/${f.name}`));
    }
    const { error } = await supabase.from("subjects").delete().eq("id", input.subject_id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  }

  if (input.exam_date && input.exam_date <= today) return jsonError("A data da prova precisa ser depois de hoje.", 400);
  const hours = input.hours_per_day ?? subject.hours_per_day;
  const { error } = await supabase
    .from("subjects")
    // renomear a "Sem pasta" a transforma numa pasta normal (a próxima "Sem pasta" nasce quando precisar)
    .update({ name: input.name, exam_date: input.exam_date, hours_per_day: hours, exam_style: input.exam_style, inbox: subject.inbox && input.name === INBOX_NAME })
    .eq("id", input.subject_id);
  if (error) throw error;

  // data/horas mudaram: refaz o plano de hoje em diante (mantém o que já foi feito); sem data, sem plano
  if (input.exam_date !== subject.exam_date || hours !== subject.hours_per_day) {
    if (input.exam_date) await refreshPlan(supabase, user.id, input.subject_id, today);
    else await supabase.from("study_plans").delete().eq("subject_id", input.subject_id);
  }
  return NextResponse.json({ ok: true });
});

import { after, NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { createFolder } from "@/lib/folders/folders";
import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.union([
  z.object({ material_id: z.uuid(), subject_id: z.uuid() }),
  z.object({ material_id: z.uuid(), new_folder: z.string().trim().min(1, "Escreva o nome da pasta").max(120) }),
]);

/**
 * Move um arquivo (e a conversa dele) para outra pasta. Os trechos vão junto e são reagrupados
 * em tópicos na pasta nova; questões já respondidas ficam no histórico da pasta antiga.
 */
export const POST = apiRoute(schema, async (input, { supabase, user }) => {
  // RLS: só acha se o material é do aluno
  const { data: m } = await supabase.from("materials").select("id, subject_id, type").eq("id", input.material_id).maybeSingle();
  if (!m) return jsonError("Arquivo não encontrado. Ele pode ter sido apagado.", 404);
  if (m.type === "past_exam") return jsonError("Provas antigas ficam na pasta do professor delas e não podem ser movidas.", 400);

  let target: string;
  if ("new_folder" in input) {
    target = await createFolder(supabase, user.id, input.new_folder);
  } else {
    const { data: s } = await supabase.from("subjects").select("id").eq("id", input.subject_id).maybeSingle();
    if (!s) return jsonError("Pasta não encontrada. Recarregue a página e tente de novo.", 404);
    target = s.id;
  }
  if (target === m.subject_id) return NextResponse.json({ subject_id: target });

  const admin = createAdminClient();
  const steps = [
    admin.from("materials").update({ subject_id: target }).eq("id", m.id),
    admin.from("chunks").update({ subject_id: target, topic_id: null }).eq("material_id", m.id),
    admin.from("chat_messages").update({ subject_id: target }).eq("material_id", m.id),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) throw error;
  }
  // a pasta nova reorganiza os tópicos (e o plano, se tiver prova)
  await enqueueJob(supabase, user.id, "cluster_topics", { subject_id: target });
  after(() => runJobs({ userId: user.id }));
  return NextResponse.json({ subject_id: target });
});

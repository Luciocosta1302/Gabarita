import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/** Atalho estável para um trecho: /chunks/<id> → página do material com o trecho destacado. */
export default async function ChunkRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: chunk } = await supabase.from("chunks").select("material_id").eq("id", id).maybeSingle();
  if (!chunk) notFound();
  const { q } = await searchParams;
  const extra = q ? `&q=${encodeURIComponent(q)}` : "";
  redirect(`/materials/${chunk.material_id}?chunk=${id}${extra}#trecho`);
}

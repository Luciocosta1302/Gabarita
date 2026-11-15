import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (!subject) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard" className="text-muted-foreground text-sm underline">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-semibold">{subject.name}</h1>
      <p className="text-muted-foreground text-sm">
        Upload de material, questões e chat chegam na Fase 1.
      </p>
    </div>
  );
}

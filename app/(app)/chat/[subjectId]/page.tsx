import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Chat } from "@/components/chat/chat";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  if (!z.uuid().safeParse(subjectId).success) notFound();
  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", subjectId).maybeSingle();
  if (!subject) notFound();
  const { count } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .eq("status", "ready");

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/subjects/${subjectId}`} className="text-muted-foreground text-sm hover:underline">
        ← {subject.name}
      </Link>
      <h1 className="text-2xl font-bold">Conversar com o material</h1>
      {count ? (
        <Chat subjectId={subjectId} />
      ) : (
        <p className="text-muted-foreground">Envie um material e espere ele ficar pronto para conversar com ele.</p>
      )}
    </div>
  );
}

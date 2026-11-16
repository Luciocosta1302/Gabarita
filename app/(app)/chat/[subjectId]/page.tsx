import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Chat } from "@/components/chat/chat";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ material?: string }>;
}) {
  const { subjectId } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(subjectId).success) notFound();
  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", subjectId).maybeSingle();
  if (!subject) notFound();
  const materialId = z.uuid().safeParse(sp.material).success ? sp.material! : undefined;
  const { data: doc } = materialId
    ? await supabase.from("materials").select("id, title, status").eq("id", materialId).eq("subject_id", subjectId).maybeSingle()
    : { data: null };
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
      <h1 className="text-2xl font-bold">{doc ? `Conversar com “${doc.title}”` : "Conversar com o material"}</h1>
      {doc && (
        <p className="text-muted-foreground -mt-2 text-sm" data-testid="chat-doc">
          Só este documento.{" "}
          <Link href={`/chat/${subjectId}`} className="text-primary underline">
            Usar todos os materiais da matéria
          </Link>
        </p>
      )}
      {(doc ? doc.status === "ready" : count) ? (
        <Chat subjectId={subjectId} materialId={doc?.id} />
      ) : (
        <p className="text-muted-foreground">Envie um material e espere ele ficar pronto para conversar com ele.</p>
      )}
    </div>
  );
}

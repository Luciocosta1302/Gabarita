import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import type { Citation } from "@/app/api/chat/route";
import { Chat, type Message } from "@/components/chat/chat";
import { createClient } from "@/lib/supabase/server";
import { ToolGuide } from "@/components/tutorials/tutorials";

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
  let hq = supabase.from("chat_messages").select("role, content, citations_json, has_basis").eq("subject_id", subjectId).order("created_at", { ascending: false }).limit(50);
  hq = doc ? hq.eq("material_id", doc.id) : hq.is("material_id", null);
  const { data: past } = await hq;
  const initial: Message[] = (past ?? []).reverse().map((m) => ({
    role: m.role as Message["role"],
    content: m.content,
    citations: m.role === "assistant" ? (m.citations_json as Citation[]) : undefined,
    noBasis: m.role === "assistant" && !m.has_basis,
  }));
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
      <ToolGuide id="chat" />
      {doc && (
        <p className="text-muted-foreground -mt-2 text-sm" data-testid="chat-doc">
          Só este documento.{" "}
          <Link href={`/chat/${subjectId}`} className="text-primary underline">
            Usar todos os materiais da matéria
          </Link>
        </p>
      )}
      {(doc ? doc.status === "ready" : count) ? (
        <Chat subjectId={subjectId} materialId={doc?.id} initial={initial} />
      ) : (
        <p className="text-muted-foreground">Envie um material e espere ele ficar pronto para conversar com ele.</p>
      )}
    </div>
  );
}

import { FileText, Layers } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import type { Citation } from "@/app/api/chat/route";
import { MascotSays } from "@/components/brand/mascot-says";
import { Chat, type Message } from "@/components/chat/chat";
import { MoveToFolder } from "@/components/chat/move-folder";
import { QuickQuiz } from "@/components/chat/quick-quiz";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { RetryButton } from "@/components/materials/material-list";
import { ToolGuide } from "@/components/tutorials/tutorials";
import { createClient } from "@/lib/supabase/server";

const SUGGESTIONS = ["Resuma este material em tópicos", "Quais são os conceitos mais importantes?", "Me faça 3 perguntas para eu treinar", "Explique a parte mais difícil de um jeito simples"];

/** Conversa com um arquivo (cada arquivo = uma conversa) ou com todos os arquivos da pasta. */
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
  const { data: subject } = await supabase.from("subjects").select("id, name, inbox").eq("id", subjectId).maybeSingle();
  if (!subject) notFound();
  const materialId = z.uuid().safeParse(sp.material).success ? sp.material! : undefined;
  const { data: doc } = materialId
    ? await supabase.from("materials").select("id, title, status, error, page_count, type").eq("id", materialId).eq("subject_id", subjectId).maybeSingle()
    : { data: null };
  if (materialId && !doc) notFound();
  let hq = supabase.from("chat_messages").select("role, content, citations_json, has_basis").eq("subject_id", subjectId).order("created_at", { ascending: false }).limit(50);
  hq = doc ? hq.eq("material_id", doc.id) : hq.is("material_id", null);
  const [{ data: past }, { count }, { data: folders }] = await Promise.all([
    hq,
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).eq("status", "ready"),
    doc ? supabase.from("subjects").select("id, name").eq("inbox", false).order("name") : Promise.resolve({ data: [] }),
  ]);
  const initial: Message[] = (past ?? []).reverse().map((m) => ({
    role: m.role as Message["role"],
    content: m.content,
    citations: m.role === "assistant" ? (m.citations_json as Citation[]) : undefined,
    noBasis: m.role === "assistant" && !m.has_basis,
  }));
  const folderName = subject.inbox ? "Sem pasta" : subject.name;
  const processing = doc && (doc.status === "pending" || doc.status === "processing");

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Onde estou" className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-sm">
        <Link href="/dashboard" className="hover:underline">
          Início
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/subjects/${subjectId}`} className="hover:underline" data-testid="chat-folder">
          {folderName}
        </Link>
      </nav>
      <h1 className="text-2xl font-bold [overflow-wrap:anywhere]">{doc ? doc.title : `Conversar com a pasta ${folderName}`}</h1>
      <ToolGuide id="chat" />

      {doc && (
        <div className="flex flex-wrap items-center gap-2" data-testid="chat-doc">
          {doc.status === "ready" && (
            <>
              <Link href={`/materials/${doc.id}`} className="tap-spring bg-card inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-ink/25 px-3 text-sm font-bold hover:border-ink">
                <FileText aria-hidden className="size-4" /> Ver arquivo
              </Link>
              <Link href={`/subjects/${subjectId}/flashcards`} className="tap-spring bg-card inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-ink/25 px-3 text-sm font-bold hover:border-ink">
                <Layers aria-hidden className="size-4" /> Flashcards
              </Link>
            </>
          )}
          {doc.type !== "past_exam" && <MoveToFolder materialId={doc.id} currentId={subjectId} folders={folders ?? []} />}
        </div>
      )}

      {doc ? (
        processing ? (
          <>
            <AutoRefresh active every={3000} />
            <MascotSays pose={{ who: "fuku", mood: "pensando" }} size="sm">
              <span data-testid="chat-processing">
                Estou lendo “{doc.title}”
                <span className="ink-dots ml-2 inline-flex gap-1 align-middle">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="text-muted-foreground mt-1 block text-xs font-normal">Leva de alguns segundos a poucos minutos. Pode sair daqui: a conversa fica salva.</span>
              </span>
            </MascotSays>
          </>
        ) : doc.status === "error" ? (
          <div className="grid gap-2">
            <MascotSays pose={{ who: "fuku", mood: "surpresa" }} size="sm">
              Não consegui ler este arquivo. {doc.error}
            </MascotSays>
            <RetryButton materialId={doc.id} />
          </div>
        ) : (
          <>
          {/* ação principal: praticar com questões; a conversa vem em seguida */}
          <QuickQuiz subjectId={subjectId} materialId={doc.id} />
          <h2 className="text-muted-foreground mt-2 text-xs font-bold tracking-[0.14em] uppercase">Ou converse com o arquivo</h2>
          <Chat
            subjectId={subjectId}
            materialId={doc.id}
            initial={initial}
            welcome={`Li “${doc.title}”${doc.page_count ? ` (${doc.page_count} ${doc.page_count === 1 ? "página" : "páginas"})` : ""}. Pergunte o que quiser: eu respondo só com base nele e mostro a página de onde tirei cada coisa.`}
            suggestions={SUGGESTIONS}
          />
          </>
        )
      ) : count ? (
        <>
          <p className="text-muted-foreground -mt-2 text-sm">Esta conversa usa todos os arquivos da pasta.</p>
          <Chat subjectId={subjectId} initial={initial} suggestions={SUGGESTIONS.slice(0, 2)} />
        </>
      ) : (
        <p className="text-muted-foreground">Envie um material e espere ele ficar pronto para conversar com ele.</p>
      )}
    </div>
  );
}

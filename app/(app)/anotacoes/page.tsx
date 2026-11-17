import { Folder } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { NewNoteButton, NoteEditor } from "@/components/notes/note-editor";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ToolGuide } from "@/components/tutorials/tutorials";

export const metadata = { title: "Anotações — Gabarita" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ id?: string; pasta?: string }> }) {
  const sp = await searchParams;
  const selected = z.uuid().safeParse(sp.id).success ? sp.id! : null;
  const folder = z.uuid().safeParse(sp.pasta).success ? sp.pasta! : null;
  const supabase = await createClient();
  let lq = supabase.from("notes").select("id, title, subject_id, updated_at").order("updated_at", { ascending: false }).limit(300);
  if (folder) lq = lq.eq("subject_id", folder);
  const [{ data: subjects }, { data: notes }, { data: note }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    lq,
    selected ? supabase.from("notes").select("id, title, content, subject_id").eq("id", selected).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const names = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Anotações</h1>
          <p className="text-muted-foreground text-sm">Suas notas por matéria. Salva sozinho enquanto você escreve.</p>
        </div>
        <NewNoteButton subjectId={folder ?? undefined} />
      </div>
      <ToolGuide id="anotacoes" />
      <nav aria-label="Pastas" className="flex flex-wrap gap-2">
        <Link href="/anotacoes" className={cn("rounded-full border px-3 py-1 text-sm", !folder ? "bg-primary text-primary-foreground" : "bg-card")}>
          Todas
        </Link>
        {(subjects ?? []).map((s) => (
          <Link key={s.id} href={`/anotacoes?pasta=${s.id}`} className={cn("rounded-full border px-3 py-1 text-sm", folder === s.id ? "bg-primary text-primary-foreground" : "bg-card")}>
            <Folder aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
            {s.name}
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <ul className="grid content-start gap-2" data-testid="notes-list">
          {(notes ?? []).length === 0 && <li className="text-muted-foreground text-sm">Nenhuma anotação.</li>}
          {(notes ?? []).map((n) => (
            <li key={n.id}>
              <Link
                href={`/anotacoes?id=${n.id}${folder ? `&pasta=${folder}` : ""}`}
                className={cn("bg-card hover:bg-accent block rounded-xl border p-3 text-sm", n.id === selected && "ring-primary ring-2")}
              >
                <span className="block truncate font-medium">{n.title}</span>
                <span className="text-muted-foreground text-xs">
                  {n.subject_id ? names.get(n.subject_id) : "Sem matéria"} · {new Date(n.updated_at).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          {note ? (
            <NoteEditor key={note.id} note={note} subjects={subjects ?? []} />
          ) : (
            <p className="text-muted-foreground text-sm">{selected ? "Anotação não encontrada." : "Escolha uma anotação ou crie uma nova."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

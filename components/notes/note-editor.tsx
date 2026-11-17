"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJSON, selectClass } from "@/lib/api/client";
import { Markdown } from "@/lib/notes/markdown";

type Note = { id: string; title: string; content: string; subject_id: string | null };
type Status = "salvo" | "editando" | "salvando" | "erro";

const AUTOSAVE_MS = 1200;

/** Editor de anotação com salvamento automático e prévia em markdown simples. */
export function NoteEditor({ note, subjects }: { note: Note; subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [subjectId, setSubjectId] = useState(note.subject_id ?? "");
  const [status, setStatus] = useState<Status>("salvo");
  const [tab, setTab] = useState<"editar" | "ver">("editar");
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    setStatus("editando");
    const t = setTimeout(async () => {
      setStatus("salvando");
      try {
        await postJSON("/api/notes", { action: "update", id: note.id, title: title.trim() || "Sem título", content, subject_id: subjectId || null });
        dirty.current = false;
        setStatus("salvo");
        router.refresh();
      } catch {
        setStatus("erro");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [content, note.id, router, subjectId, title]);

  // avisa antes de sair com alterações não salvas
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    dirty.current = true;
    set(v);
  };

  return (
    <div className="grid gap-3" data-testid="note-editor">
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Título" value={title} maxLength={200} onChange={(e) => edit(setTitle)(e.target.value)} className="min-w-48 flex-1 font-semibold" />
        <select aria-label="Matéria" className={selectClass} value={subjectId} onChange={(e) => edit(setSubjectId)(e.target.value)}>
          <option value="">Sem matéria</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground w-20 text-right text-xs" data-testid="note-status" aria-live="polite">
          {status === "salvo" ? "Salvo ✓" : status === "salvando" ? "Salvando..." : status === "erro" ? "Erro ao salvar" : "Editando..."}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        <Button size="sm" role="tab" aria-selected={tab === "editar"} variant={tab === "editar" ? "default" : "outline"} onClick={() => setTab("editar")}>
          Escrever
        </Button>
        <Button size="sm" role="tab" aria-selected={tab === "ver"} variant={tab === "ver" ? "default" : "outline"} onClick={() => setTab("ver")}>
          Ver formatado
        </Button>
      </div>
      {tab === "editar" ? (
        <Textarea
          aria-label="Anotação"
          className="min-h-80 font-mono text-sm"
          value={content}
          maxLength={100000}
          placeholder={"# Título\n- tópico com **negrito**\n> citação"}
          onChange={(e) => edit(setContent)(e.target.value)}
        />
      ) : (
        <div className="bg-card min-h-80 rounded-xl border p-4">{content.trim() ? <Markdown source={content} /> : <p className="text-muted-foreground text-sm">Nada escrito ainda.</p>}</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={!subjectId || content.trim().length < 50}
          title={!subjectId ? "Escolha a matéria primeiro" : content.trim().length < 50 ? "Escreva pelo menos algumas frases" : undefined}
          onClick={async () => {
            setMsg(null);
            try {
              const r = await postJSON<{ material_id: string }>("/api/upload", { subject_id: subjectId, kind: "text", title: title.trim() || "Anotação", text: content });
              router.push(`/subjects/${subjectId}?material=${r.material_id}`);
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Falha ao transformar em material.");
            }
          }}
        >
          Transformar em material
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (!window.confirm("Apagar esta anotação?")) return;
            dirty.current = false;
            await postJSON("/api/notes", { action: "delete", id: note.id });
            router.push("/anotacoes");
            router.refresh();
          }}
        >
          Apagar
        </Button>
        {msg && <span className="text-destructive text-sm">{msg}</span>}
      </div>
      <p className="text-muted-foreground text-xs">“Transformar em material” copia a anotação para a matéria; aí ela vira questões, flashcards e entra no chat.</p>
    </div>
  );
}

export function NewNoteButton({ subjectId }: { subjectId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await postJSON<{ id: string }>("/api/notes", { action: "create", subject_id: subjectId });
          router.push(`/anotacoes?id=${r.id}`);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      + Nova anotação
    </Button>
  );
}

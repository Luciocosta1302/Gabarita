"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON, selectClass } from "@/lib/api/client";

export const CATEGORY_LABELS = { duvida: "❓ Dúvida", dica: "💡 Dica", material: "📚 Material", grupo: "👥 Grupo de estudo" } as const;

export function NewPostForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<keyof typeof CATEGORY_LABELS>("duvida");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button onClick={() => setOpen(true)}>+ Novo post</Button>;
  return (
    <form
      className="bg-card grid gap-3 rounded-2xl border p-4 shadow-sm"
      data-testid="new-post"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const r = await postJSON<{ id: string }>("/api/community", { action: "post", category, title, body });
          router.push(`/comunidade/${r.id}`);
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : "Falha ao publicar.");
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="cat">Categoria</Label>
        <select id="cat" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as keyof typeof CATEGORY_LABELS)}>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="post-title">Título</Label>
        <Input id="post-title" required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="post-body">Texto</Label>
        <Textarea id="post-body" required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <p className="text-muted-foreground text-xs">Seu nome do perfil aparece no post. Seja gentil e não compartilhe dados pessoais.</p>
      {err && <p className="text-destructive text-sm">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          Publicar
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const router = useRouter();
  const [state, setState] = useState({ liked, count });
  return (
    <Button
      size="sm"
      variant={state.liked ? "default" : "outline"}
      aria-pressed={state.liked}
      data-testid="like"
      onClick={async () => {
        const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
        setState(next);
        try {
          await postJSON("/api/community", { action: "like", post_id: postId, like: next.liked });
          router.refresh();
        } catch {
          setState(state);
        }
      }}
    >
      ♥ {state.count}
    </Button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await postJSON("/api/community", { action: "comment", post_id: postId, body });
          setBody("");
          router.refresh();
        } catch (e2) {
          setErr(e2 instanceof Error ? e2.message : "Falha ao comentar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Textarea aria-label="Comentário" required maxLength={3000} placeholder="Escreva uma resposta..." value={body} onChange={(e) => setBody(e.target.value)} />
      {err && <p className="text-destructive text-sm">{err}</p>}
      <Button type="submit" disabled={busy} className="justify-self-start">
        Comentar
      </Button>
    </form>
  );
}

export function DeleteButton({ action, id, redirect }: { action: "delete_post" | "delete_comment"; id: string; redirect?: string }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        if (!window.confirm("Apagar?")) return;
        await postJSON("/api/community", { action, id });
        if (redirect) router.push(redirect);
        router.refresh();
      }}
    >
      Apagar
    </Button>
  );
}

const REPORT_LABELS = { ofensivo: "Ofensivo ou discriminatório", spam: "Spam / propaganda", golpe: "Golpe ou venda de prova", dados_pessoais: "Expõe dados pessoais", outro: "Outro motivo" } as const;

export function ReportButton({ target, id }: { target: "post" | "comment"; id: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (done) return <span className="text-muted-foreground text-xs">Denúncia enviada. Obrigado!</span>;
  if (!open)
    return (
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setOpen(true)}>
        Denunciar
      </Button>
    );
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs" data-testid="report-form">
      {Object.entries(REPORT_LABELS).map(([k, v]) => (
        <Button
          key={k}
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await postJSON("/api/community", { action: "report", target, id, reason: k });
              setDone(true);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Falha ao denunciar.");
            }
          }}
        >
          {v}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      {err && <span className="text-destructive">{err}</span>}
    </span>
  );
}

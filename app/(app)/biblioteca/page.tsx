import Link from "next/link";
import { z } from "zod";

import { Highlighted } from "@/components/materials/highlighted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Biblioteca — Gabarita" };

const TYPE_LABEL: Record<string, string> = { pdf: "PDF", image: "Fotos", docx: "DOCX", text: "Texto", audio: "Áudio", past_exam: "Prova antiga" };
const STATUS_LABEL: Record<string, string> = { pending: "na fila", processing: "processando", ready: "pronto", error: "erro" };

/** Busca de texto: escapa os curingas do LIKE. */
const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Biblioteca pessoal: matérias como pastas, busca por título e dentro do texto, chat por documento. */
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; pasta?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const folder = z.uuid().safeParse(sp.pasta).success ? sp.pasta! : null;
  const supabase = await createClient();

  let mq = supabase.from("materials").select("id, subject_id, title, type, status, page_count, created_at").order("created_at", { ascending: false }).limit(500);
  if (folder) mq = mq.eq("subject_id", folder);
  if (q) mq = mq.ilike("title", likeTerm(q));
  let cq = supabase.from("chunks").select("id, material_id, page, content, materials!inner(title, subject_id, type)").limit(20);
  if (folder) cq = cq.eq("materials.subject_id", folder);

  const [{ data: subjects }, { data: materials }, { data: hits }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    mq,
    q.length >= 3 ? cq.ilike("content", likeTerm(q)) : Promise.resolve({ data: null }),
  ]);
  const names = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const groups = (subjects ?? [])
    .map((s) => ({ ...s, items: (materials ?? []).filter((m) => m.subject_id === s.id) }))
    .filter((g) => g.items.length > 0 || (!q && folder === g.id));
  const href = (p: { q?: string; pasta?: string | null }) => {
    const u = new URLSearchParams();
    if (p.q) u.set("q", p.q);
    if (p.pasta) u.set("pasta", p.pasta);
    return `/biblioteca${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <p className="text-muted-foreground text-sm">Todos os seus materiais, organizados por matéria. Busque pelo título ou por uma frase de dentro do texto.</p>
      </div>

      <form className="flex gap-2" role="search" action="/biblioteca">
        {folder && <input type="hidden" name="pasta" value={folder} />}
        <Input name="q" defaultValue={q} placeholder="Buscar nos materiais..." aria-label="Buscar nos materiais" maxLength={100} />
        <Button type="submit">Buscar</Button>
      </form>

      <nav aria-label="Pastas" className="flex flex-wrap gap-2">
        <Link href={href({ q })} className={cn("rounded-full border px-3 py-1 text-sm", !folder ? "bg-primary text-primary-foreground" : "bg-card")}>
          Todas
        </Link>
        {(subjects ?? []).map((s) => (
          <Link key={s.id} href={href({ q, pasta: s.id })} className={cn("rounded-full border px-3 py-1 text-sm", folder === s.id ? "bg-primary text-primary-foreground" : "bg-card")}>
            📁 {s.name}
          </Link>
        ))}
      </nav>

      {hits && (
        <section className="grid gap-3" data-testid="library-hits">
          <h2 className="font-semibold">Dentro do texto ({hits.length}{hits.length === 20 ? "+" : ""})</h2>
          {hits.length === 0 && <p className="text-muted-foreground text-sm">Nenhum trecho com “{q}”.</p>}
          {hits.map((h) => {
            const i = h.content.toLowerCase().indexOf(q.toLowerCase());
            const start = Math.max(0, i - 120);
            const snippet = `${start > 0 ? "…" : ""}${h.content.slice(start, Math.max(i, 0) + q.length + 160)}…`;
            const paged = h.materials.type === "pdf" || h.materials.type === "image";
            return (
              <Link key={h.id} href={`/materials/${h.material_id}?chunk=${h.id}#trecho`} className="bg-card hover:bg-accent grid gap-1 rounded-2xl border p-3 text-sm shadow-sm">
                <span className="text-muted-foreground text-xs">
                  {h.materials.title} · {names.get(h.materials.subject_id)}
                  {h.page != null ? ` · ${paged ? "p." : "parte"} ${h.page}` : ""}
                </span>
                <Highlighted text={snippet} quote={q} />
              </Link>
            );
          })}
        </section>
      )}

      <section className="grid gap-5" data-testid="library-folders">
        {groups.length === 0 && <p className="text-muted-foreground text-sm">{q ? `Nenhum material com “${q}” no título.` : "Nenhum material ainda. Envie um pela página da matéria."}</p>}
        {groups.map((g) => (
          <div key={g.id} className="grid gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              📁 <Link href={`/subjects/${g.id}`} className="hover:underline">{g.name}</Link>
              <span className="text-muted-foreground text-xs font-normal">{g.items.length} material(is)</span>
            </h2>
            <ul className="grid gap-2">
              {g.items.map((m) => (
                <li key={m.id} className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm" data-testid="library-item">
                  <div>
                    <Link href={`/materials/${m.id}`} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {TYPE_LABEL[m.type] ?? m.type}
                      {m.page_count ? ` · ${m.page_count} pág./partes` : ""} · {STATUS_LABEL[m.status] ?? m.status} · {new Date(m.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {m.status === "ready" && m.type !== "past_exam" && (
                    <Link href={`/chat/${m.subject_id}?material=${m.id}`} className="text-primary text-sm underline">
                      💬 Conversar com este documento
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

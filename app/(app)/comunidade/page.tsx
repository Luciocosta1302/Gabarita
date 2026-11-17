import Link from "next/link";

import { loadPublicProfiles } from "@/lib/profile/load";
import { AuthorChip } from "@/components/avatar/author-chip";
import { CATEGORY_LABELS, NewPostForm } from "@/components/community/community";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { COMMUNITY_CATEGORIES } from "@/lib/validation/generate";
import { ToolGuide } from "@/components/tutorials/tutorials";

export const metadata = { title: "Comunidade — Gabarita" };

type Cat = (typeof COMMUNITY_CATEGORIES)[number];

const PAGE_SIZE = 20;

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ cat?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const cat = (COMMUNITY_CATEGORIES as readonly string[]).includes(sp.cat ?? "") ? (sp.cat as Cat) : null;
  const supabase = await createClient();
  const pageNum = Math.max(1, Math.min(500, Number.parseInt(sp.pagina ?? "1", 10) || 1));
  let pq = supabase
    .from("community_posts")
    .select("id, user_id, author_name, category, title, body, created_at", { count: "exact" })
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);
  if (cat) pq = pq.eq("category", cat);
  const { data: posts, count: total } = await pq;
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const pageHref = (n: number) => `/comunidade?${new URLSearchParams({ ...(cat ? { cat } : {}), ...(n > 1 ? { pagina: String(n) } : {}) })}`;
  const ids = (posts ?? []).map((p) => p.id);
  const authors = await loadPublicProfiles(supabase, (posts ?? []).map((p) => p.user_id));
  const [{ data: likes }, { data: comments }] = ids.length
    ? await Promise.all([
        supabase.from("community_likes").select("post_id").in("post_id", ids),
        supabase.from("community_comments").select("post_id").in("post_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const tally = (rows: { post_id: string }[] | null) => (rows ?? []).reduce((m, r) => m.set(r.post_id, (m.get(r.post_id) ?? 0) + 1), new Map<string, number>());
  const likeCount = tally(likes);
  const commentCount = tally(comments);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Comunidade</h1>
          <p className="text-muted-foreground text-sm">Tire dúvidas, troque dicas e encontre gente para estudar junto.</p>
        </div>
      </div>
      <ToolGuide id="comunidade" />
      <NewPostForm />
      <nav aria-label="Categorias" className="flex flex-wrap gap-2">
        <Link href="/comunidade" className={cn("rounded-full border px-3 py-1 text-sm", !cat ? "bg-primary text-primary-foreground" : "bg-card")}>
          Tudo
        </Link>
        {COMMUNITY_CATEGORIES.map((c) => (
          <Link key={c} href={`/comunidade?cat=${c}`} className={cn("rounded-full border px-3 py-1 text-sm", cat === c ? "bg-primary text-primary-foreground" : "bg-card")}>
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>
      <ul className="grid gap-3" data-testid="posts">
        {(posts ?? []).length === 0 && <li className="text-muted-foreground text-sm">Nenhum post ainda. Que tal começar?</li>}
        {(posts ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/comunidade/${p.id}`} className="bg-card hover:bg-accent grid gap-1.5 rounded-2xl border p-4 shadow-sm">
              <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <AuthorChip profile={authors.get(p.user_id)} fallbackName={p.author_name} link={false} className="text-foreground" />
                <span>
                  {CATEGORY_LABELS[p.category as Cat]} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </span>
              </span>
              <span className="font-semibold">{p.title}</span>
              <span className="text-muted-foreground line-clamp-2 text-sm">{p.body}</span>
              <span className="text-muted-foreground text-xs">
                ♥ {likeCount.get(p.id) ?? 0} · {commentCount.get(p.id) ?? 0} {commentCount.get(p.id) === 1 ? "resposta" : "respostas"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-3 text-sm" data-testid="pagination">
          {pageNum > 1 ? <Link href={pageHref(pageNum - 1)} className="text-primary underline">← Mais novos</Link> : <span />}
          <span className="text-muted-foreground">
            Página {pageNum} de {pages}
          </span>
          {pageNum < pages ? <Link href={pageHref(pageNum + 1)} className="text-primary underline">Mais antigos →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

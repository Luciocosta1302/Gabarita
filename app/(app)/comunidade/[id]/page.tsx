import Link from "next/link";
import { loadPublicProfiles } from "@/lib/profile/load";
import { AuthorChip } from "@/components/avatar/author-chip";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CATEGORY_LABELS, CommentForm, DeleteButton, LikeButton, ReportButton } from "@/components/community/community";
import { createClient } from "@/lib/supabase/server";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: post }, { data: comments }, { data: likes }] = await Promise.all([
    supabase.from("community_posts").select("id, user_id, author_name, category, title, body, created_at, hidden").eq("id", id).maybeSingle(),
    supabase.from("community_comments").select("id, user_id, author_name, body, created_at, hidden").eq("post_id", id).order("created_at").limit(500),
    supabase.from("community_likes").select("user_id").eq("post_id", id),
  ]);
  if (!post) notFound();
  const liked = (likes ?? []).some((l) => l.user_id === user?.id);
  const people = await loadPublicProfiles(supabase, [post.user_id, ...(comments ?? []).map((c) => c.user_id)]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/comunidade" className="text-muted-foreground text-sm hover:underline">
        ← Comunidade
      </Link>
      {post.hidden && (
        <p role="status" className="bg-pastel-rose rounded-2xl px-4 py-3 text-sm">
          Este post recebeu várias denúncias e está escondido para os outros alunos.
        </p>
      )}
      <article className="bg-card grid gap-3 rounded-2xl border p-5 shadow-sm" data-testid="post">
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <AuthorChip profile={people.get(post.user_id)} fallbackName={post.author_name} size={32} className="text-foreground text-sm" />
          <span>
            {CATEGORY_LABELS[post.category as keyof typeof CATEGORY_LABELS]} · {new Date(post.created_at).toLocaleString("pt-BR")}
          </span>
        </span>
        <h1 className="text-xl font-bold">{post.title}</h1>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
        <div className="flex items-center gap-2">
          <LikeButton postId={post.id} liked={liked} count={likes?.length ?? 0} />
          {post.user_id === user?.id ? <DeleteButton action="delete_post" id={post.id} redirect="/comunidade" /> : <ReportButton target="post" id={post.id} />}
        </div>
      </article>
      <section className="grid gap-3">
        <h2 className="font-semibold">Respostas ({comments?.length ?? 0})</h2>
        <ul className="grid gap-2" data-testid="comments">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="bg-card grid gap-1 rounded-xl border p-3 text-sm">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <AuthorChip profile={people.get(c.user_id)} fallbackName={c.author_name} className="text-foreground" />
                  <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                </span>
                {c.user_id === user?.id ? <DeleteButton action="delete_comment" id={c.id} /> : <ReportButton target="comment" id={c.id} />}
              </div>
              {c.hidden && <p className="text-destructive text-xs">Escondida por denúncias (só você vê).</p>}
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
        <CommentForm postId={post.id} />
      </section>
    </div>
  );
}

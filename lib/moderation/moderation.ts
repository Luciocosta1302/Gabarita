import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";

/**
 * Moderação da Comunidade. Quem modera: e-mails em ADMIN_EMAILS (separados por vírgula), configurado
 * no servidor. Lê e altera com service role, porque o aluno comum não vê denúncias dos outros.
 */
export function isModerator(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export type QueueItem = {
  kind: "post" | "comment";
  id: string;
  author_name: string;
  title: string | null;
  body: string;
  hidden: boolean;
  created_at: string;
  reports: number;
  reasons: Record<string, number>;
  post_id: string;
};

/** Itens com denúncia (escondidos primeiro, depois os mais denunciados). */
export async function loadQueue(admin: AdminClient): Promise<QueueItem[]> {
  const { data: reports, error } = await admin.from("community_reports").select("post_id, comment_id, reason").limit(5000);
  if (error) throw error;
  const tally = new Map<string, { n: number; reasons: Record<string, number> }>();
  for (const r of reports ?? []) {
    const key = r.post_id ? `post:${r.post_id}` : `comment:${r.comment_id}`;
    const t = tally.get(key) ?? { n: 0, reasons: {} };
    t.n++;
    t.reasons[r.reason] = (t.reasons[r.reason] ?? 0) + 1;
    tally.set(key, t);
  }
  const postIds = [...tally.keys()].filter((k) => k.startsWith("post:")).map((k) => k.slice(5));
  const commentIds = [...tally.keys()].filter((k) => k.startsWith("comment:")).map((k) => k.slice(8));
  const [{ data: posts }, { data: comments }] = await Promise.all([
    postIds.length ? admin.from("community_posts").select("id, author_name, title, body, hidden, created_at").in("id", postIds) : Promise.resolve({ data: [] }),
    commentIds.length ? admin.from("community_comments").select("id, post_id, author_name, body, hidden, created_at").in("id", commentIds) : Promise.resolve({ data: [] }),
  ]);
  const items: QueueItem[] = [
    ...(posts ?? []).map((p) => ({ kind: "post" as const, id: p.id, author_name: p.author_name, title: p.title, body: p.body, hidden: p.hidden, created_at: p.created_at, post_id: p.id, reports: tally.get(`post:${p.id}`)!.n, reasons: tally.get(`post:${p.id}`)!.reasons })),
    ...(comments ?? []).map((c) => ({ kind: "comment" as const, id: c.id, author_name: c.author_name, title: null, body: c.body, hidden: c.hidden, created_at: c.created_at, post_id: c.post_id, reports: tally.get(`comment:${c.id}`)!.n, reasons: tally.get(`comment:${c.id}`)!.reasons })),
  ];
  return items.sort((a, b) => Number(b.hidden) - Number(a.hidden) || b.reports - a.reports);
}

/** restaurar = volta a aparecer e zera as denúncias; apagar = remove de vez. */
export async function moderate(admin: AdminClient, input: { kind: "post" | "comment"; id: string; action: "restore" | "delete" }) {
  const table = input.kind === "post" ? "community_posts" : "community_comments";
  if (input.action === "delete") {
    const { error } = await admin.from(table).delete().eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await admin.from(table).update({ hidden: false }).eq("id", input.id);
  if (error) throw error;
  const { error: e2 } = await admin.from("community_reports").delete().eq(input.kind === "post" ? "post_id" : "comment_id", input.id);
  if (e2) throw e2;
}

import Link from "next/link";
import { z } from "zod";

import { ReviewSession, type ReviewItem } from "@/components/review/review-session";
import { createClient } from "@/lib/supabase/server";

const MAX_PER_SESSION = 50;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const subjectId = z.uuid().safeParse(subject).success ? subject! : null;
  const supabase = await createClient();
  const now = new Date().toISOString();

  let q = supabase
    .from("reviews")
    .select("id, item_type, item_id, due_at, subjects(name)")
    .lte("due_at", now)
    .order("due_at")
    .limit(MAX_PER_SESSION);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data: due } = await q;

  const cardIds = (due ?? []).filter((r) => r.item_type === "flashcard").map((r) => r.item_id);
  const questionIds = (due ?? []).filter((r) => r.item_type === "question").map((r) => r.item_id);
  const [{ data: cards }, { data: questions }, { count: upcoming }] = await Promise.all([
    cardIds.length ? supabase.from("flashcards").select("id, front, back, chunk_id").in("id", cardIds) : Promise.resolve({ data: [] }),
    questionIds.length ? supabase.from("questions").select("id, stem, options_json").in("id", questionIds) : Promise.resolve({ data: [] }),
    supabase.from("reviews").select("id", { count: "exact", head: true }).gt("due_at", now),
  ]);
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const qById = new Map((questions ?? []).map((c) => [c.id, c]));

  const items: ReviewItem[] = [];
  for (const r of due ?? []) {
    const subjectName = r.subjects?.name ?? "";
    if (r.item_type === "flashcard") {
      const c = cardById.get(r.item_id);
      if (c) items.push({ kind: "flashcard", id: c.id, subject: subjectName, front: c.front, back: c.back, chunkId: c.chunk_id });
    } else {
      const qq = qById.get(r.item_id);
      if (qq) items.push({ kind: "question", id: qq.id, subject: subjectName, question: { id: qq.id, stem: qq.stem, options: (qq.options_json as string[]) ?? [] } });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Revisar hoje</h1>
        <p className="text-muted-foreground text-sm">
          Flashcards e questões que você errou voltam no momento certo para não esquecer (repetição espaçada).
          {upcoming ? ` Mais ${upcoming} ${upcoming === 1 ? "item agendado" : "itens agendados"} para os próximos dias.` : ""}
        </p>
        {subjectId && (
          <Link href="/review" className="text-primary text-sm underline">
            Revisar todas as matérias
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="bg-pastel-mint rounded-2xl p-6 text-center" data-testid="review-empty">
          <p className="font-display text-xl font-bold">Nada para revisar agora</p>
          <p className="text-sm">Crie flashcards ou faça questões; o que precisar de revisão aparece aqui.</p>
        </div>
      ) : (
        <ReviewSession items={items} />
      )}
    </div>
  );
}

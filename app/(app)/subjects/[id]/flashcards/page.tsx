import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Flashcard } from "@/components/flashcards/flashcard";
import { GenerateFlashcardsForm } from "@/components/flashcards/generate-flashcards-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ToolGuide } from "@/components/tutorials/tutorials";

export default async function FlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", id).maybeSingle();
  if (!subject) notFound();

  const [{ data: cards }, { data: materials }] = await Promise.all([
    supabase.from("flashcards").select("id, front, back, chunk_id").eq("subject_id", id).order("created_at", { ascending: false }),
    supabase.from("materials").select("id, title").eq("subject_id", id).eq("status", "ready"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-muted-foreground text-sm hover:underline">
        ← {subject.name}
      </Link>
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <ToolGuide id="flashcards" />
      <Card>
        <CardHeader>
          <CardTitle>Criar flashcards</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateFlashcardsForm subjectId={id} materials={materials ?? []} />
        </CardContent>
      </Card>
      {!cards?.length ? (
        <p className="text-muted-foreground text-sm">Nenhum flashcard ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="flashcard-list">
          {cards.map((c) => (
            <Flashcard key={c.id} front={c.front} back={c.back} chunkId={c.chunk_id} />
          ))}
        </div>
      )}
    </div>
  );
}

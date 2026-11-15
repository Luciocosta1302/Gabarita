"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MaterialOption } from "@/components/quiz/generate-quiz-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";
import { MAX_FLASHCARDS_PER_REQUEST } from "@/lib/limits";

export function GenerateFlashcardsForm({ subjectId, materials }: { subjectId: string; materials: MaterialOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await postJSON("/api/generate/flashcards", {
        subject_id: subjectId,
        material_id: form.get("material_id") || undefined,
        count: Number(form.get("count")),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar flashcards.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="f-count">Quantidade</Label>
        <Input id="f-count" name="count" type="number" min={1} max={MAX_FLASHCARDS_PER_REQUEST} defaultValue={10} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f-material">Material</Label>
        <select id="f-material" name="material_id" defaultValue="" className={selectClass}>
          <option value="">Todos</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !materials.length} className="justify-self-start">
        {busy ? "Criando..." : "Criar flashcards"}
      </Button>
    </form>
  );
}

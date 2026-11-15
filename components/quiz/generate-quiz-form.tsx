"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIFFICULTY_LABELS } from "@/lib/ai/prompts/questions";
import { postJSON, selectClass } from "@/lib/api/client";
import { MAX_QUESTIONS_PER_REQUEST } from "@/lib/limits";

export type MaterialOption = { id: string; title: string };

export function GenerateQuizForm({ subjectId, materials }: { subjectId: string; materials: MaterialOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await postJSON<{ quiz_id: string }>("/api/generate/questions", {
        subject_id: subjectId,
        material_id: form.get("material_id") || undefined,
        count: Number(form.get("count")),
        difficulty: form.get("difficulty"),
      });
      router.push(`/quiz/${res.quiz_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar questões.");
      setBusy(false);
    }
  }

  const disabled = busy || materials.length === 0;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor="q-count">Quantidade</Label>
        <Input id="q-count" name="count" type="number" min={1} max={MAX_QUESTIONS_PER_REQUEST} defaultValue={10} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="q-difficulty">Dificuldade</Label>
        <select id="q-difficulty" name="difficulty" defaultValue="misturada" className={selectClass}>
          {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="q-material">Material</Label>
        <select id="q-material" name="material_id" defaultValue="" className={selectClass}>
          <option value="">Todos</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {error}
        </p>
      )}
      <Button type="submit" disabled={disabled} className="justify-self-start sm:col-span-3">
        {busy ? "Gerando questões... (pode levar até 1 min)" : "Gerar questões"}
      </Button>
      {materials.length === 0 && (
        <p className="text-muted-foreground text-xs sm:col-span-3">Precisa de pelo menos um material pronto.</p>
      )}
    </form>
  );
}

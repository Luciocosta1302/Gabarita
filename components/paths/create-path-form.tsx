"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";

export function CreatePathForm({ subjects }: { subjects: { id: string; name: string; topics: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usable = subjects.filter((s) => s.topics > 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await postJSON<{ path_id: string }>("/api/paths", { subject_id: form.get("subject_id"), goal: form.get("goal") });
      router.push(`/trilhas/${r.path_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a trilha.");
      setBusy(false);
    }
  }

  if (!usable.length) {
    return <p className="text-muted-foreground text-sm">Envie um material em alguma matéria; quando os tópicos aparecerem, dá para criar a trilha.</p>;
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="path-subject">Matéria</Label>
        <select id="path-subject" name="subject_id" className={selectClass}>
          {usable.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="path-goal">Seu objetivo</Label>
        <Input id="path-goal" name="goal" required maxLength={300} placeholder="Ex.: entender divisão celular para a P2" />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="justify-self-start">
        {busy ? "Montando a trilha..." : "Criar trilha"}
      </Button>
    </form>
  );
}

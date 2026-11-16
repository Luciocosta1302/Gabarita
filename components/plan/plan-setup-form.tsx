"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON } from "@/lib/api/client";

export function PlanSetupForm({
  subjectId,
  examDate,
  hoursPerDay,
  submitLabel = "Montar plano",
}: {
  subjectId: string;
  examDate?: string | null;
  hoursPerDay?: number | null;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/plan", {
        action: "setup",
        subject_id: subjectId,
        exam_date: form.get("exam_date"),
        hours_per_day: Number(form.get("hours_per_day")),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao montar o plano.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="plan-exam-date">Data da prova</Label>
        <Input id="plan-exam-date" name="exam_date" type="date" required defaultValue={examDate ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="plan-hours">Horas por dia</Label>
        <Input id="plan-hours" name="hours_per_day" type="number" min={0.5} max={24} step={0.5} required defaultValue={hoursPerDay ?? 2} />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Montando..." : submitLabel}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  );
}

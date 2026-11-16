"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";
import { EXAM_STYLE_LABELS, SIMULADO_STYLES, STYLE_SPECS, simuladoStyle, type ExamStyle } from "@/lib/exam-styles";
import { MAX_QUESTIONS_PER_REQUEST } from "@/lib/limits";

/** D16 — cria um simulado cronometrado no estilo da banca. */
export function SimuladoForm({ subjectId, defaultStyle, disabled }: { subjectId: string; defaultStyle: string; disabled?: boolean }) {
  const router = useRouter();
  const [style, setStyle] = useState<ExamStyle>(simuladoStyle(defaultStyle));
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minutes = Math.round(count * STYLE_SPECS[style].minutesPerQuestion);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await postJSON<{ quiz_id: string }>("/api/generate/questions", {
        subject_id: subjectId,
        count,
        style,
        difficulty: "misturada",
        mode: "simulado",
      });
      router.push(`/quiz/${r.quiz_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao montar o simulado.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="s-count">Questões</Label>
        <Input
          id="s-count"
          type="number"
          min={5}
          max={MAX_QUESTIONS_PER_REQUEST}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(MAX_QUESTIONS_PER_REQUEST, Number(e.target.value) || 0)))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="s-style">Banca</Label>
        <select id="s-style" value={style} onChange={(e) => setStyle(e.target.value as ExamStyle)} className={selectClass}>
          {SIMULADO_STYLES.map((s) => (
            <option key={s} value={s}>
              {EXAM_STYLE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-muted-foreground text-sm">
        Tempo: <strong>{minutes} min</strong> ({STYLE_SPECS[style].minutesPerQuestion} min por questão, como na prova)
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || disabled} className="justify-self-start">
        {busy ? "Montando o simulado..." : "Criar simulado"}
      </Button>
    </form>
  );
}

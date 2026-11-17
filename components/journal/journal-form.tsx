"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export const MOOD_LABELS = { otimo: "😄 Ótimo", bem: "🙂 Bem", ok: "😐 Ok", cansado: "😴 Cansado", frustrado: "😣 Frustrado" } as const;
type Mood = keyof typeof MOOD_LABELS;

/** Registro do fim da sessão de estudo. */
export function JournalForm({ subjects, focusMinutes }: { subjects: { id: string; name: string }[]; focusMinutes?: number }) {
  const router = useRouter();
  const [learned, setLearned] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4"
      data-testid="journal-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!mood) return setMsg("Escolha como você está.");
        setBusy(true);
        setMsg(null);
        try {
          await postJSON("/api/journal", {
            action: "add",
            learned,
            difficulties,
            mood,
            subject_id: subjectId || undefined,
            focus_minutes: focusMinutes,
          });
          setLearned("");
          setDifficulties("");
          setMood(null);
          setMsg("Registro salvo ✓");
          router.refresh();
        } catch (err) {
          setMsg(err instanceof Error ? err.message : "Falha ao salvar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="learned">O que você aprendeu hoje?</Label>
        <Textarea id="learned" required minLength={3} maxLength={3000} value={learned} onChange={(e) => setLearned(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="difficulties">Onde teve dificuldade? (opcional)</Label>
        <Textarea id="difficulties" maxLength={3000} value={difficulties} onChange={(e) => setDifficulties(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Como você está">
        <span className="text-sm">Como você está?</span>
        {(Object.keys(MOOD_LABELS) as Mood[]).map((m) => (
          <Button key={m} type="button" size="sm" role="radio" aria-checked={mood === m} variant={mood === m ? "default" : "outline"} onClick={() => setMood(m)}>
            {MOOD_LABELS[m]}
          </Button>
        ))}
      </div>
      {subjects.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="subject">Matéria (opcional)</Label>
          <select id="subject" className="bg-card h-9 w-full max-w-full truncate rounded-md border px-2 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">—</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar registro"}
        </Button>
        {msg && <span className={cn("text-sm", msg.includes("✓") ? "text-muted-foreground" : "text-destructive")}>{msg}</span>}
      </div>
    </form>
  );
}

export function ReflectButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Button
        variant="secondary"
        className="justify-self-start"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await postJSON("/api/journal", { action: "reflect" });
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Falha ao gerar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Lendo seu diário..." : "Gerar acompanhamento da semana"}
      </Button>
      {err && <p className="text-destructive text-sm">{err}</p>}
    </div>
  );
}

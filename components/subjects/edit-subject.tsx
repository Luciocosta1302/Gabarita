"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";
import { EXAM_STYLE_LABELS, EXAM_STYLES } from "@/lib/exam-styles";

type Subject = { id: string; name: string; exam_date: string | null; hours_per_day: number | null; exam_style: string };

/** Editar a matéria (refaz o plano se a data/horas mudarem) ou apagá-la. */
export function EditSubject({ subject }: { subject: Subject }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <details className="bg-card rounded-2xl border p-4 text-sm" data-testid="edit-subject">
      <summary className="cursor-pointer font-medium">⚙️ Editar matéria</summary>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setMsg(null);
          try {
            await postJSON("/api/subjects", { action: "update", subject_id: subject.id, ...f });
            setMsg("Salvo ✓");
            router.refresh();
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Falha ao salvar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="edit-name">Nome</Label>
          <Input id="edit-name" name="name" required maxLength={120} defaultValue={subject.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-date">Data da prova</Label>
          <Input id="edit-date" name="exam_date" type="date" defaultValue={subject.exam_date ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="edit-hours">Horas por dia</Label>
          <Input id="edit-hours" name="hours_per_day" type="number" min={0.5} max={24} step={0.5} defaultValue={subject.hours_per_day ?? ""} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="edit-style">Estilo da prova</Label>
          <select id="edit-style" name="exam_style" className={selectClass} defaultValue={subject.exam_style}>
            {EXAM_STYLES.map((s) => (
              <option key={s} value={s}>
                {EXAM_STYLE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted-foreground text-xs sm:col-span-2">Mudar a data ou as horas refaz o plano de hoje em diante (o que você já fez fica).</p>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            Salvar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Apagar "${subject.name}" com todos os materiais, questões, plano e histórico? Não dá para desfazer.`)) return;
              setBusy(true);
              try {
                await postJSON("/api/subjects", { action: "delete", subject_id: subject.id });
                router.push("/dashboard");
                router.refresh();
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Falha ao apagar.");
                setBusy(false);
              }
            }}
          >
            Apagar matéria
          </Button>
          {msg && <span className={msg.includes("✓") ? "text-muted-foreground" : "text-destructive"}>{msg}</span>}
        </div>
      </form>
    </details>
  );
}

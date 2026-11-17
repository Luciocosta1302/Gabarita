"use client";

import { FolderPlus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { createSubject, type CreateSubjectState } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClass } from "@/lib/api/client";
import { EXAM_STYLE_LABELS, EXAM_STYLES } from "@/lib/exam-styles";

/**
 * Nova pasta: o foco é só o nome. Prova marcada (data, horas/dia, banca) é opcional e fica
 * recolhida — com ela o Gabarita monta o plano até a prova.
 */
export function CreateSubjectForm() {
  const [state, action, pending] = useActionState<CreateSubjectState, FormData>(createSubject, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <Label htmlFor="name" className="sr-only">
        Nome da pasta
      </Label>
      <div className="flex gap-2">
        <Input id="name" name="name" placeholder="Nome da pasta (ex.: Cálculo I, ENEM)" required maxLength={120} className="h-12 flex-1 text-base" autoComplete="off" />
        <Button type="submit" disabled={pending} size="lg" className="shrink-0">
          <FolderPlus aria-hidden className="size-4" />
          {pending ? "Criando..." : "Criar pasta"}
        </Button>
      </div>

      <details className="group rounded-xl">
        <summary className="text-muted-foreground hover:text-ink cursor-pointer text-sm font-bold select-none">Tem prova marcada? (opcional — com a data, eu monto o plano até a prova)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="exam_date">Data da prova</Label>
            <Input id="exam_date" name="exam_date" type="date" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hours_per_day">Horas por dia</Label>
            <Input id="hours_per_day" name="hours_per_day" type="number" min={0.5} max={24} step={0.5} placeholder="2" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="exam_style">Estilo da prova</Label>
            <select id="exam_style" name="exam_style" defaultValue="livre" className={selectClass}>
              {EXAM_STYLES.map((s) => (
                <option key={s} value={s}>
                  {EXAM_STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      {state.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

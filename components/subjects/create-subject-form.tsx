"use client";

import { useActionState, useEffect, useRef } from "react";

import { createSubject, type CreateSubjectState } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXAM_STYLE_LABELS, EXAM_STYLES } from "@/lib/exam-styles";

export function CreateSubjectForm() {
  const [state, action, pending] = useActionState<CreateSubjectState, FormData>(createSubject, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="name">Matéria / prova</Label>
        <Input id="name" name="name" placeholder="Ex.: Cálculo I — P1" required maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="exam_date">Data da prova</Label>
        <Input id="exam_date" name="exam_date" type="date" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hours_per_day">Horas por dia</Label>
        <Input id="hours_per_day" name="hours_per_day" type="number" min={0.5} max={24} step={0.5} />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="exam_style">Estilo da prova</Label>
        <select
          id="exam_style"
          name="exam_style"
          defaultValue="livre"
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          {EXAM_STYLES.map((s) => (
            <option key={s} value={s}>
              {EXAM_STYLE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {state.error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:col-span-2 sm:justify-self-start">
        {pending ? "Criando..." : "Criar matéria"}
      </Button>
    </form>
  );
}

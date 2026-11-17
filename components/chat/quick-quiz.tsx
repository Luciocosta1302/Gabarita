"use client";

import { ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJSON } from "@/lib/api/client";
import { play } from "@/lib/feedback/sound";

/** Ação principal do arquivo pronto: 10 questões só deste arquivo, com fonte e gabarito conferido. */
export function QuickQuiz({ subjectId, materialId }: { subjectId: string; materialId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy}
        data-testid="quick-quiz"
        onClick={async () => {
          setBusy(true);
          setError(null);
          play("tap");
          try {
            const r = await postJSON<{ quiz_id: string }>("/api/generate/questions", { subject_id: subjectId, material_id: materialId, count: 10 });
            router.push(`/quiz/${r.quiz_id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não deu para gerar as questões agora.");
            setBusy(false);
          }
        }}
        className="stamp-press bg-primary text-primary-foreground flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left disabled:opacity-70"
      >
        <ListChecks aria-hidden className="size-7 shrink-0" />
        <span>
          <span className="block text-lg font-bold">{busy ? "Criando e conferindo as questões..." : "Gerar 10 questões"}</span>
          <span className="block text-sm opacity-90">Cada uma com a página de onde saiu e o gabarito conferido</span>
        </span>
      </button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

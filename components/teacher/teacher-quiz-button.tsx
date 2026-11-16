"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

/** Gera questões no estilo do professor (D4), opcionalmente de um tópico. */
export function TeacherQuizButton({
  subjectId,
  topicId,
  count = 10,
  label,
  variant = "default",
}: {
  subjectId: string;
  topicId?: string;
  count?: number;
  label: string;
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <Button
        size={variant === "outline" ? "sm" : "default"}
        variant={variant}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await postJSON<{ quiz_id: string }>("/api/generate/questions", {
              subject_id: subjectId,
              topic_id: topicId,
              count,
              style: "professor",
              difficulty: "misturada",
            });
            router.push(`/quiz/${r.quiz_id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha ao gerar.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Gerando..." : label}
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

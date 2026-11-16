"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

export function PracticeButton({ subjectId, topicId, label = "Praticar" }: { subjectId: string; topicId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await postJSON<{ quiz_id: string }>("/api/generate/questions", { subject_id: subjectId, topic_id: topicId, count: 10 });
            router.push(`/quiz/${r.quiz_id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha.");
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

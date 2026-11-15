"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

export function SummaryButton({ materialId, label }: { materialId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/generate/summary", { material_id: materialId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o resumo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={run} disabled={busy} variant="secondary" className="justify-self-start">
        {busy ? "Resumindo... (pode levar até 1 min)" : label}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

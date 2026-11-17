"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

export function ModerationActions({ kind, id }: { kind: "post" | "comment"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: "restore" | "delete") => {
    if (action === "delete" && !window.confirm("Apagar de vez? Não tem volta.")) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/moderation", { kind, id, action });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("restore")} data-testid="mod-restore">
        Está ok: mostrar de novo
      </Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("delete")} data-testid="mod-delete">
        Apagar
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import type { StudyGoal } from "@/lib/news/catalog";

import { NewsSetup } from "./news-setup";

type Prefs = { sources: string[]; custom_feeds: string[]; state: string | null; city: string | null };

/** "Atualizar" (busca as fontes de novo) e "Ajustar fontes" (abre a configuração). */
export function NewsToolbar({ goal, prefs }: { goal: StudyGoal | null; prefs: Prefs }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await postJSON("/api/news/refresh", {});
            } catch {
              /* a lista continua com o que já tem */
            }
            setBusy(false);
            router.refresh();
          }}
        >
          <RefreshCw aria-hidden className={busy ? "size-4 animate-spin" : "size-4"} />
          {busy ? "Atualizando..." : "Atualizar"}
        </Button>
        <Button variant={editing ? "default" : "outline"} size="sm" onClick={() => setEditing(!editing)} aria-expanded={editing}>
          <SlidersHorizontal aria-hidden className="size-4" />
          Ajustar fontes
        </Button>
      </div>
      {editing && (
        <div className="bg-card rounded-2xl border-2 border-ink p-4 shadow-[0_3px_0_var(--ink)]">
          <NewsSetup goal={goal} prefs={prefs} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}

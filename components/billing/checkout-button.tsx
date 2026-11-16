"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

export function CheckoutButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-1">
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const r = await postJSON<{ url: string }>("/api/payments/checkout", {});
            window.location.href = r.url;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Falha ao abrir o pagamento.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Abrindo o pagamento..." : label}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

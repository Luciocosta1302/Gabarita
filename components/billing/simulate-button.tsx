"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";

export function SimulateButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJSON("/api/payments/simulate", { payment_id: paymentId });
        router.push("/planos?status=aprovado");
        router.refresh();
      }}
    >
      {busy ? "Aprovando..." : "Simular Pix aprovado"}
    </Button>
  );
}

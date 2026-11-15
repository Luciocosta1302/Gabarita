"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Enquanto `active`, atualiza a página e cutuca a fila de jobs (para itens que ainda estão sendo gerados). */
export function AutoRefresh({ active, every = 3000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const refresh = setInterval(() => router.refresh(), every);
    const kick = setInterval(() => fetch("/api/jobs/process", { method: "POST" }).catch(() => {}), 15000);
    return () => {
      clearInterval(refresh);
      clearInterval(kick);
    };
  }, [active, every, router]);
  return null;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

export type MaterialRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  page_count: number | null;
  error: string | null;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Na fila", className: "bg-muted text-muted-foreground" },
  processing: { label: "Processando...", className: "bg-pastel-peach text-foreground" },
  ready: { label: "Pronto", className: "bg-pastel-mint text-foreground" },
  error: { label: "Erro", className: "bg-destructive/15 text-destructive" },
};

const TYPE_LABEL: Record<string, string> = { pdf: "PDF", image: "Fotos", docx: "DOCX", pptx: "Slides", text: "Texto", audio: "Áudio da aula", web: "Página da web", youtube: "Vídeo do YouTube", past_exam: "Prova antiga" };

/** Lista de materiais. Enquanto algum está processando, atualiza a tela sozinha. */
export function MaterialList({ materials }: { materials: MaterialRow[] }) {
  const router = useRouter();
  const busy = materials.some((m) => m.status === "pending" || m.status === "processing");

  useEffect(() => {
    if (!busy) return;
    const refresh = setInterval(() => router.refresh(), 3000);
    // Se nada processou a fila (ex.: o servidor reiniciou), a própria tela pede para processar.
    const kick = setInterval(() => fetch("/api/jobs/process", { method: "POST" }).catch(() => {}), 15000);
    return () => {
      clearInterval(refresh);
      clearInterval(kick);
    };
  }, [busy, router]);

  if (!materials.length) {
    return <p className="text-muted-foreground text-sm">Nenhum material ainda. Envie um PDF, fotos ou cole um texto.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="material-list">
      {materials.map((m) => {
        const s = STATUS[m.status] ?? STATUS.pending;
        return (
          <li key={m.id} className="bg-card flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0">
              {m.status === "ready" && m.type !== "past_exam" ? (
                <Link href={`/materials/${m.id}`} className="block truncate font-medium hover:underline">
                  {m.title}
                </Link>
              ) : (
                <span className="block truncate font-medium">{m.title}</span>
              )}
              <span className="text-muted-foreground text-xs">
                {TYPE_LABEL[m.type] ?? m.type}
                {m.page_count ? ` · ${m.page_count} ${m.type === "pdf" || m.type === "image" ? "páginas" : "partes"}` : ""}
              </span>
              {m.status === "error" && m.error && <p className="text-destructive text-xs">{m.error}</p>}
            </div>
            <span
              data-testid="material-status"
              className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", s.className)}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

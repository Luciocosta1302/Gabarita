"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/** Ícone do site de origem (buscado pelo nosso servidor) + nome; sem ícone, mostra as iniciais. */
export function SourceLogo({ domain, name, size = 20, className }: { domain: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(!domain);
  const initials =
    name
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 || /\d/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md border-[1.5px] border-ink/20 bg-white", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {failed ? (
        <span className="text-ink font-sans text-[9px] leading-none font-extrabold">{initials}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- ícone vem da nossa rota, tamanho fixo
        <img src={`/api/news/icon?d=${encodeURIComponent(domain!)}`} alt="" width={size} height={size} className="size-full object-contain" loading="lazy" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

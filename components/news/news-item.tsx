"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CharacterAvatar } from "@/components/brand/character";
import type { NewsSummary } from "@/lib/ai/prompts/news";
import { postJSON } from "@/lib/api/client";
import { TAG_LABELS } from "@/lib/news/catalog";

export type NewsRow = { id: string; title: string; url: string; snippet: string | null; source_name: string; published_at: string; tags: string[]; summary: (NewsSummary & { partial: boolean }) | null };

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  if (mins < 24 * 60) return `há ${Math.round(mins / 60)} h`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });
}

/** Uma notícia: fonte, quando, título (abre o original), trecho, #etiquetas e o resumo da Fuku. */
export function NewsItem({ item, period }: { item: NewsRow; /** período atual (o link da #etiqueta mantém) */ period: string }) {
  const [summary, setSummary] = useState(item.summary);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    setOpen(true);
    if (summary) return;
    setBusy(true);
    setError(null);
    try {
      setSummary(await postJSON<NewsSummary & { partial: boolean }>("/api/news/summary", { id: item.id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para resumir agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bg-card animate-rise grid gap-2 rounded-2xl border-2 border-ink/15 p-4" data-testid="news-item">
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
        <span className="text-ink font-bold">{item.source_name}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.published_at}>{when(item.published_at)}</time>
      </p>
      <h2 className="font-sans text-base leading-snug font-bold">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.title}
          <ExternalLink aria-label="(abre o site original)" className="text-muted-foreground ml-1 inline size-3.5 align-[-1px]" />
        </a>
      </h2>
      {item.snippet && <p className="text-muted-foreground line-clamp-3 text-sm">{item.snippet}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.tags.map((t) => (
          <Link key={t} href={`/noticias?periodo=${period}&tag=${t}`} className="bg-background rounded-full border-[1.5px] border-ink/20 px-2 py-0.5 text-xs font-bold hover:border-ink">
            #{TAG_LABELS[t]?.toLowerCase().replace(/\s|-/g, "") ?? t}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : summarize())}
          aria-expanded={open}
          className="text-shu ml-auto inline-flex items-center gap-1 text-sm font-bold hover:underline"
          data-testid="news-summarize"
        >
          <Sparkles aria-hidden className="size-4" />
          {open ? "Fechar resumo" : "Resumo da Fuku"}
        </button>
      </div>
      {open && (
        <div className="bg-background animate-slide-up flex gap-3 rounded-xl border-[1.5px] border-ink/15 p-3 text-sm" data-testid="news-summary">
          <CharacterAvatar pose={{ who: "fuku", mood: busy ? "pensando" : "explicando" }} />
          <div className="grid min-w-0 gap-2">
            {busy && (
              <span className="text-muted-foreground">
                Lendo a notícia
                <span className="ink-dots ml-2 inline-flex gap-1 align-middle">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            )}
            {error && <p role="alert" className="text-destructive">{error}</p>}
            {summary && (
              <>
                <ul className="list-disc space-y-1 pl-4">
                  {summary.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                {summary.dates.length > 0 && <p className="font-bold">Datas: {summary.dates.join(" · ")}</p>}
                <p className="text-muted-foreground">{summary.why}</p>
                <p className="text-muted-foreground text-xs">
                  {summary.partial ? "Resumo feito só com o trecho (o site não deixou ler o texto todo). " : "Resumo feito pela IA a partir do texto da notícia. "}
                  Confira os detalhes no site original.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

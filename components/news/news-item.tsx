"use client";

import { ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CharacterAvatar } from "@/components/brand/character";
import { postJSON } from "@/lib/api/client";
import { TAG_LABELS } from "@/lib/news/catalog";
import type { CheckedSummary } from "@/lib/news/verify";

import { SourceLogo } from "./source-badge";

export type NewsRow = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
  source_name: string;
  source_domain: string | null;
  published_at: string;
  tags: string[];
  summary: CheckedSummary | null;
  via: string | null;
};

const TZ = "America/Sao_Paulo";
function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  if (mins < 24 * 60) return `há ${Math.round(mins / 60)} h`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: TZ });
}
const fullDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: TZ });

/**
 * Uma notícia, sempre com a origem à vista: ícone e nome do jornal, site, data e hora da publicação e o link
 * para o original. O resumo só mostra frases conferidas com o texto (cada uma com o trecho original).
 */
export function NewsItem({ item, period }: { item: NewsRow; /** período atual (o link da #etiqueta mantém) */ period: string }) {
  const [summary, setSummary] = useState(item.summary?.v === 2 ? item.summary : null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function summarize() {
    setOpen(true);
    if (summary) return;
    setBusy(true);
    setError(null);
    try {
      setSummary(await postJSON<CheckedSummary>("/api/news/summary", { id: item.id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para resumir agora.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bg-card animate-rise grid gap-2 rounded-2xl border-2 border-ink/15 p-4" data-testid="news-item">
      {/* origem: sempre visível */}
      <div className="flex min-w-0 items-center gap-2 text-xs" data-testid="news-source">
        <SourceLogo domain={item.source_domain} name={item.source_name} size={22} />
        <span className="min-w-0">
          <span className="text-ink block truncate font-bold">{item.source_name}</span>
          <span className="text-muted-foreground block truncate">
            {item.source_domain ?? "site de origem"}
            {item.via && ` · via ${item.via}`}
          </span>
        </span>
        <time dateTime={item.published_at} title={`Publicada em ${fullDate(item.published_at)}`} className="text-muted-foreground ml-auto shrink-0">
          {when(item.published_at)}
        </time>
      </div>
      <h2 className="font-sans text-base leading-snug font-bold">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.title}
        </a>
      </h2>
      {item.snippet && <p className="text-muted-foreground line-clamp-3 text-sm">{item.snippet}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {item.tags.map((t) => (
          <Link key={t} href={`/noticias?periodo=${period}&tag=${t}`} className="bg-background rounded-full border-[1.5px] border-ink/20 px-2 py-0.5 text-xs font-bold hover:border-ink">
            #{TAG_LABELS[t]?.toLowerCase().replace(/\s|-/g, "") ?? t}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-spring bg-background inline-flex items-center gap-1.5 rounded-full border-2 border-ink/25 px-3 py-1 text-sm font-bold hover:border-ink"
          data-testid="news-original"
        >
          <ExternalLink aria-hidden className="size-3.5" /> Ler no site original
        </a>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : summarize())}
          aria-expanded={open}
          className="text-shu inline-flex items-center gap-1 text-sm font-bold hover:underline"
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
                Lendo e conferindo a notícia
                <span className="ink-dots ml-2 inline-flex gap-1 align-middle">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            )}
            {error && <p role="alert" className="text-destructive">{error}</p>}
            {summary && summary.points.length === 0 && (
              <p data-testid="news-summary-empty">
                Não consegui fazer um resumo que eu pudesse conferir no texto desta notícia. Para não arriscar informação errada, leia direto no{" "}
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  site original
                </a>
                .
              </p>
            )}
            {summary && summary.points.length > 0 && (
              <>
                <ul className="grid gap-2">
                  {[...summary.points, ...summary.dates].map((p, i) => (
                    <li key={i} className="grid gap-0.5">
                      <span className="flex gap-2">
                        <span aria-hidden className="bg-shu mt-[7px] size-1.5 shrink-0 rounded-full" />
                        <span>{p.text}</span>
                      </span>
                      <span className="text-muted-foreground border-ink/15 ml-3.5 border-l-2 pl-2 text-xs italic" title="Trecho original da notícia">
                        “{p.evidence}”
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground flex items-start gap-1.5 text-xs" data-testid="news-summary-note">
                  <ShieldCheck aria-hidden className="text-matcha mt-px size-4 shrink-0" />
                  <span>
                    Cada frase foi conferida com o texto de <strong>{item.source_domain ?? item.source_name}</strong> (o trecho original aparece embaixo).
                    {summary.partial && " Só tivemos acesso ao trecho da notícia, não ao texto completo."}
                    {summary.dropped > 0 && ` Tirei ${summary.dropped} ${summary.dropped === 1 ? "frase que não consegui" : "frases que não consegui"} conferir.`}{" "}
                    Resumo automático: na dúvida, vale o site original.
                  </span>
                </p>
              </>
            )}
            {summary && <SourceLink item={item} />}
          </div>
        </div>
      )}
      {/* link da notícia sempre no fim do cartão */}
      {!open && <SourceLink item={item} />}
    </article>
  );
}

/** "Fonte: Jornal — link completo", no fim da notícia e do resumo. */
function SourceLink({ item }: { item: NewsRow }) {
  return (
    <p className="text-muted-foreground min-w-0 border-t border-ink/10 pt-2 text-xs" data-testid="news-link">
      Fonte: <strong className="text-ink">{item.source_name}</strong>
      {item.via && ` (via ${item.via})`} —{" "}
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary break-all underline">
        {item.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </a>
    </p>
  );
}

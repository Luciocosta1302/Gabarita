import { BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

import { TAG_LABELS } from "@/lib/news/catalog";

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
 * Uma notícia de verdade, sempre com a origem à vista: ícone e nome do jornal, site, data e hora e o link
 * do original. Título e trecho são os publicados pelo jornal — o Gabarita não escreve nem resume.
 */
export function NewsItem({ item, period }: { item: NewsRow; /** período atual (o link da #etiqueta mantém) */ period: string }) {
  const short = item.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  return (
    <article className="bg-card animate-rise grid gap-2 rounded-2xl border-2 border-ink/15 p-4" data-testid="news-item">
      {/* origem: sempre visível */}
      <div className="flex min-w-0 items-center gap-2 text-xs" data-testid="news-source">
        <SourceLogo domain={item.source_domain} name={item.source_name} size={24} />
        <span className="min-w-0">
          <span className="text-ink flex items-center gap-1 truncate font-bold">
            {item.source_name}
            <BadgeCheck aria-label="notícia original do jornal" className="text-matcha size-3.5 shrink-0" />
          </span>
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
      {item.snippet && (
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {item.snippet}
          <span className="sr-only"> (trecho publicado por {item.source_name})</span>
        </p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.tags.map((t) => (
            <Link key={t} href={`/noticias?periodo=${period}&tag=${t}`} className="bg-background rounded-full border-[1.5px] border-ink/20 px-2 py-0.5 text-xs font-bold hover:border-ink">
              #{TAG_LABELS[t]?.toLowerCase().replace(/\s|-/g, "") ?? t}
            </Link>
          ))}
        </div>
      )}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-spring bg-background inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-ink/25 px-3 py-1 text-sm font-bold hover:border-ink"
        data-testid="news-original"
      >
        <ExternalLink aria-hidden className="size-3.5" /> Ler no site original
      </a>
      {/* link da notícia sempre no fim do cartão: uma linha, cortado com "…" */}
      <p className="text-muted-foreground flex min-w-0 items-baseline gap-1 border-t border-ink/10 pt-2 text-xs" data-testid="news-link">
        <span className="shrink-0">
          Fonte: <strong className="text-ink">{item.source_name}</strong>
          {item.via && ` (via ${item.via})`} · {new Date(item.published_at).toLocaleDateString("pt-BR", { timeZone: TZ })} —
        </span>
        <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.url} className="text-primary min-w-0 truncate underline">
          {short}
        </a>
      </p>
    </article>
  );
}

import { Search } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";

import { MascotSays } from "@/components/brand/mascot-says";
import { AutoRefresh } from "@/components/layout/auto-refresh";
import { NewsItem, type NewsRow } from "@/components/news/news-item";
import { NewsSetup } from "@/components/news/news-setup";
import { NewsToolbar } from "@/components/news/news-toolbar";
import { ToolGuide } from "@/components/tutorials/tutorials";
import { Card, CardContent } from "@/components/ui/card";
import { PERIODS, type Period, type StudyGoal, TAG_LABELS } from "@/lib/news/catalog";
import { feedsFor, refreshFeeds } from "@/lib/news/service";
import type { CheckedSummary } from "@/lib/news/verify";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notícias — Gabarita" };

type SP = { periodo?: string; tag?: string; q?: string; fonte?: string };

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("study_goal").eq("id", user!.id).single(),
    supabase.from("news_prefs").select("sources, custom_feeds, state, city").maybeSingle(),
  ]);
  const goal = (profile?.study_goal ?? null) as StudyGoal | null;

  const header = (
    <div className="animate-rise">
      <p className="eyebrow flex items-center gap-2">
        <span className="font-display text-shu text-sm tracking-normal" lang="ja" title="shinbun, jornal">
          新聞
        </span>
        Educação, vestibulares e concursos
      </p>
      <h1 className="mt-1 text-3xl md:text-4xl">Notícias</h1>
    </div>
  );

  if (!prefs) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ToolGuide id="noticias" />
        <MascotSays pose={{ who: "fuku", mood: "explicando" }} size="sm">
          Me conta o que você estuda e de onde quer receber notícias. Eu junto tudo aqui e resumo quando você pedir.
        </MascotSays>
        <Card>
          <CardContent className="pt-6">
            <NewsSetup goal={goal} prefs={null} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const feeds = feedsFor(prefs, goal);
  // busca em segundo plano as fontes que estão há mais de 30 min sem atualizar
  after(() => refreshFeeds(feeds));

  const period = (PERIODS.find((p) => p.id === sp.periodo)?.id ?? "semana") as Period;
  const days = PERIODS.find((p) => p.id === period)!.days;
  const tag = sp.tag && TAG_LABELS[sp.tag] ? sp.tag : null;
  const source = feeds.find((f) => f.key === sp.fonte)?.key ?? null;
  const q = (sp.q ?? "").trim().slice(0, 80);

  let query = supabase
    .from("news_items")
    .select("id, feed_key, title, url, snippet, source_name, source_domain, published_at, tags, summary_json")
    .in("feed_key", source ? [source] : feeds.map((f) => f.key))
    .order("published_at", { ascending: false })
    .limit(60);
  if (days) query = query.gte("published_at", new Date(Date.now() - days * 86_400_000).toISOString());
  if (tag) query = query.contains("tags", [tag]);
  if (q) {
    const safe = q.replace(/[%_,()]/g, " ");
    query = query.or(`title.ilike.%${safe}%,snippet.ilike.%${safe}%`);
  }
  const [{ data: rows }, { data: feedState }] = await Promise.all([query, supabase.from("news_feeds").select("feed_key, ok, fetched_at").in("feed_key", feeds.map((f) => f.key))]);
  const items: NewsRow[] = (rows ?? []).map(({ summary_json, feed_key, ...r }) => ({
    ...r,
    summary: (summary_json as CheckedSummary | null) ?? null,
    // notícias da região chegam pelo Google Notícias: mostra o jornal real e o "via"
    via: feed_key.startsWith("local:") ? "Google Notícias" : null,
  }));
  const state = new Map((feedState ?? []).map((f) => [f.feed_key, f]));
  const waiting = feeds.some((f) => !state.get(f.key)?.fetched_at);
  const down = feeds.filter((f) => state.get(f.key)?.ok === false);
  // etiquetas mais comuns nas notícias da tela (para filtrar com um toque)
  const tagCount = new Map<string, number>();
  for (const r of items) for (const t of r.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 10);
  if (tag && !topTags.includes(tag)) topTags.unshift(tag);

  const href = (patch: Partial<SP>) => {
    const next = { periodo: period, tag: tag ?? undefined, q: q || undefined, fonte: source ?? undefined, ...patch };
    const params = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/noticias${params.size ? `?${params}` : ""}`;
  };
  const chip = (active: boolean) =>
    cn("tap-spring rounded-full border-2 px-3 py-1 text-sm font-bold", active ? "border-ink bg-primary text-primary-foreground shadow-[0_2px_0_var(--ink)]" : "bg-card border-ink/20 hover:border-ink/60");

  return (
    <div className="flex flex-col gap-5">
      {header}
      <ToolGuide id="noticias" />
      <AutoRefresh active={waiting && items.length === 0} every={4000} />
      <NewsToolbar goal={goal} prefs={prefs} />

      {/* filtros: período, busca, fonte e #etiquetas */}
      <nav aria-label="Período" className="grid grid-cols-4 gap-1.5" data-testid="news-periods">
        {PERIODS.map((p) => (
          <Link key={p.id} href={href({ periodo: p.id })} aria-current={period === p.id ? "true" : undefined} className={cn(chip(period === p.id), "text-center")}>
            {p.label}
          </Link>
        ))}
      </nav>
      <form action="/noticias" role="search" className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="periodo" value={period} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label className="relative min-w-0">
          <span className="sr-only">Buscar nas notícias</span>
          <Search aria-hidden className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input name="q" defaultValue={q} placeholder="Buscar: ENEM, edital, sua cidade..." className="border-input bg-card h-10 w-full rounded-xl border-[1.5px] pr-3 pl-9 text-sm" />
        </label>
        <button type="submit" className="bg-ink text-washi h-10 rounded-xl px-4 text-sm font-bold sm:order-last">
          Filtrar
        </button>
        <select name="fonte" defaultValue={source ?? ""} aria-label="Fonte" className="border-input bg-card col-span-2 h-10 w-full min-w-0 truncate rounded-xl border-[1.5px] px-2 text-sm sm:col-span-1 sm:w-48">
          <option value="">Todas as fontes</option>
          {feeds.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name}
            </option>
          ))}
        </select>
      </form>
      {topTags.length > 0 && (
        <nav aria-label="Etiquetas" className="flex flex-wrap gap-1.5" data-testid="news-tags">
          {topTags.map((t) => (
            <Link key={t} href={href({ tag: tag === t ? undefined : t })} className={cn(chip(tag === t), "px-2.5 py-0.5 text-xs")}>
              #{TAG_LABELS[t].toLowerCase().replace(/\s|-/g, "")}
            </Link>
          ))}
        </nav>
      )}

      {down.length > 0 && (
        <p className="text-muted-foreground text-xs" data-testid="news-down">
          Fora do ar agora: {down.map((f) => f.name).join(", ")}. Tentamos de novo daqui a pouco.
        </p>
      )}

      {items.length === 0 ? (
        waiting ? (
          <MascotSays pose={{ who: "fuku", mood: "pensando" }} size="sm">
            Buscando as notícias das suas fontes
            <span className="ink-dots ml-2 inline-flex gap-1 align-middle">
              <span />
              <span />
              <span />
            </span>
          </MascotSays>
        ) : (
          <MascotSays pose={{ who: "fuku", mood: "surpresa" }} size="sm">
            Nada {tag || q ? "com esse filtro" : "neste período"}. Tente “Mês” ou “Tudo”{tag || q ? ", ou limpe o filtro" : ""}.
          </MascotSays>
        )
      ) : (
        <div className="grid gap-3" data-testid="news-list">
          {items.map((it) => (
            <NewsItem key={it.id} item={it} period={period} />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-center text-xs">
        Cada notícia mostra o jornal e o site de onde veio; toque em “Ler no site original” para a versão completa. O Gabarita não escreve
        notícias: o resumo da Fuku é automático, conferido frase a frase com o texto, e na dúvida vale o original.
      </p>
    </div>
  );
}

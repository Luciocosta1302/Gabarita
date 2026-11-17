import "server-only";

import { readText, safeFetch } from "@/lib/ingest/links";
import { createAdminClient } from "@/lib/supabase/admin";

import { customFeedKey, localFeed, NEWS_SOURCES, type StudyGoal, tagsFor } from "./catalog";
import { domainOf, feedTitle, parseFeed } from "./rss";

export type Feed = { key: string; name: string; url: string };
export type NewsPrefs = { sources: string[]; custom_feeds: string[]; state: string | null; city: string | null };

/** Os feeds que o aluno acompanha: fontes do catálogo + região + links colados por ele. */
export function feedsFor(prefs: NewsPrefs, goal: StudyGoal | null): Feed[] {
  const out: Feed[] = NEWS_SOURCES.filter((s) => prefs.sources.includes(s.id)).map((s) => ({ key: s.id, name: s.name, url: s.url }));
  if (prefs.state) out.push(localFeed(prefs.state, prefs.city, goal));
  for (const url of prefs.custom_feeds) {
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* fica a própria URL */
    }
    out.push({ key: customFeedKey(url), name: host, url });
  }
  return out;
}

const FRESH_MS = 30 * 60_000;

/** Busca os feeds que estão há mais de 30 min sem atualizar (ou todos, com `force`). Falha de uma fonte não derruba as outras. */
export async function refreshFeeds(feeds: Feed[], { force = false } = {}) {
  if (!feeds.length) return;
  const admin = createAdminClient();
  const { data: state } = await admin.from("news_feeds").select("feed_key, fetched_at").in("feed_key", feeds.map((f) => f.key));
  const last = new Map((state ?? []).map((s) => [s.feed_key, s.fetched_at ? new Date(s.fetched_at).getTime() : 0]));
  const stale = feeds.filter((f) => force || Date.now() - (last.get(f.key) ?? 0) > FRESH_MS);

  await Promise.all(
    stale.map(async (f) => {
      try {
        const { res } = await safeFetch(f.url, { accept: "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5", timeoutMs: 12_000 });
        const xml = await readText(res);
        const items = parseFeed(xml);
        // links colados pelo aluno: o nome vem do próprio feed (em vez do endereço do site)
        const feedName = f.key.startsWith("custom:") ? (feedTitle(xml) ?? f.name) : f.name;
        const now = Date.now();
        const rows = items.map((it) => {
          // no Google Notícias o título vem "Título - Jornal"
          const title = it.source && it.title.endsWith(` - ${it.source}`) ? it.title.slice(0, -(it.source.length + 3)) : it.title;
          return {
            feed_key: f.key,
            source_name: (it.source ?? feedName).slice(0, 80),
            url: it.url,
            title,
            snippet: it.snippet,
            published_at: new Date(Math.min(it.publishedAt?.getTime() ?? now, now)).toISOString(),
            tags: tagsFor(`${title} ${it.snippet ?? ""}`),
            // site de origem: o do jornal citado (agregadores) ou o do próprio link
            source_domain: domainOf(it.sourceUrl) ?? domainOf(it.url),
          };
        });
        if (rows.length) {
          const { error } = await admin.from("news_items").upsert(rows, { onConflict: "url", ignoreDuplicates: true });
          if (error) throw error;
        }
        await admin.from("news_feeds").upsert({ feed_key: f.key, url: f.url, fetched_at: new Date().toISOString(), ok: true, error: null, item_count: rows.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[news] ${f.key}:`, msg);
        await admin.from("news_feeds").upsert({ feed_key: f.key, url: f.url, fetched_at: new Date().toISOString(), ok: false, error: msg.slice(0, 300) });
      }
    }),
  );
}

/** Resume uma notícia (texto completo do site quando dá; senão, o trecho). Fica guardado para os próximos alunos. */

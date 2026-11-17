import { decodeEntities } from "@/lib/ingest/html";

/** Uma notícia lida de um feed RSS 2.0 ou Atom. */
export type FeedItem = { title: string; url: string; snippet: string | null; publishedAt: Date | null; source: string | null };

const MAX_ITEMS = 40;

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
}

/** Texto limpo: tira HTML, decodifica entidades, junta espaços e corta. */
export function cleanSnippet(html: string | null, max = 320): string | null {
  if (!html) return null;
  const text = decodeEntities(
    html
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
}

function date(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(decodeEntities(raw.trim()));
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Lê RSS 2.0 (<item>) ou Atom (<entry>), sem biblioteca. Itens sem título ou link válido são ignorados. */
export function parseFeed(xml: string): FeedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: FeedItem[] = [];
  for (const b of blocks.slice(0, MAX_ITEMS)) {
    const title = cleanSnippet(tag(b, "title"), 300);
    const link = isAtom
      ? (b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? b.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? null)
      : (tag(b, "link") ?? tag(b, "guid"));
    const url = safeHttpUrl(link);
    if (!title || !url) continue;
    out.push({
      title,
      url,
      snippet: cleanSnippet(tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content") ?? tag(b, "content:encoded")),
      publishedAt: date(tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date")),
      source: cleanSnippet(tag(b, "source"), 80),
    });
  }
  return out;
}

/** Nome do jornal/site informado no próprio feed (<channel><title> ou <feed><title>). */
export function feedTitle(xml: string): string | null {
  const head = xml.split(/<item[\s>]|<entry[\s>]/i)[0];
  return cleanSnippet(tag(head, "title"), 80);
}

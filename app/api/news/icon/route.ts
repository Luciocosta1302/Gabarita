import { NextResponse } from "next/server";

import { readLimitedBytes, safeFetch } from "@/lib/ingest/links";
import { NEWS_SOURCES } from "@/lib/news/catalog";
import { domainOf } from "@/lib/news/rss";
import { getUser } from "@/lib/supabase/server";

const MAX_ICON = 300 * 1024;
const OK_TYPES = /^image\/(png|x-icon|vnd\.microsoft\.icon|jpeg|gif|webp)\b/i;
const CATALOG = new Set(NEWS_SOURCES.map((s) => domainOf(s.url)).filter(Boolean));

async function fetchIcon(url: string) {
  const { res } = await safeFetch(url, { accept: "image/png,image/x-icon,image/*;q=0.8", timeoutMs: 6_000 });
  const type = res.headers.get("content-type") ?? "";
  // SVG fica de fora: pode carregar script se alguém abrir o endereço direto
  if (!OK_TYPES.test(type)) throw new Error("não é imagem");
  return { body: await readLimitedBytes(res, MAX_ICON), type: type.split(";")[0] };
}

/**
 * Ícone (favicon) do site de origem da notícia, buscado pelo nosso servidor: o aparelho do aluno não fala
 * com sites de terceiros. Só para sites do catálogo ou que aparecem nas notícias. Falhou = 404 (a tela mostra as iniciais).
 */
export async function GET(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const d = new URL(req.url).searchParams.get("d")?.toLowerCase() ?? "";
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) || d.length > 100) return new NextResponse(null, { status: 400 });
  if (!CATALOG.has(d)) {
    const { count } = await supabase.from("news_items").select("id", { count: "exact", head: true }).eq("source_domain", d);
    if (!count) return new NextResponse(null, { status: 404 });
  }
  let icon: { body: Uint8Array; type: string } | null = null;
  try {
    icon = await fetchIcon(`https://${d}/favicon.ico`);
  } catch {
    try {
      // sem /favicon.ico: procura o <link rel="icon"> da página inicial
      const { res, url } = await safeFetch(`https://${d}/`, { accept: "text/html", timeoutMs: 6_000 });
      const html = new TextDecoder().decode(await readLimitedBytes(res, 512 * 1024));
      const href = html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/gi)?.map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1]).find((h) => h && !/\.svg(\?|$)/i.test(h));
      if (href) icon = await fetchIcon(new URL(href, url).toString());
    } catch {
      /* sem ícone */
    }
  }
  if (!icon) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, max-age=86400" } });
  return new NextResponse(Buffer.from(icon.body), {
    headers: { "Content-Type": icon.type, "Cache-Control": "private, max-age=604800", "Content-Security-Policy": "default-src 'none'" },
  });
}

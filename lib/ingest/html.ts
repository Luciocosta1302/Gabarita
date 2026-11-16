/** Funções puras para links (sem rede): YouTube, endereços internos, HTML → texto. */

/** Id de vídeo do YouTube (watch, youtu.be, shorts, embed, live) ou null. */
export function youtubeId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
  const ok = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? id : null);
  if (host === "youtu.be") return ok(u.pathname.slice(1).split("/")[0]);
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  if (u.pathname === "/watch") return ok(u.searchParams.get("v"));
  const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
  return ok(m?.[2]);
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Endereço que não pode ser buscado pelo servidor (loopback, rede interna, link-local, metadados, multicast...). */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / metadados da nuvem
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast e reservados
    );
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") || // unique local
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") || // link-local
    v6.startsWith("ff") || // multicast
    v6.startsWith("64:ff9b:") ||
    v6.startsWith("2001:db8")
  );
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", ordm: "º", ordf: "ª", deg: "°" };

export function decodeEntities(s: string) {
  return s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    const named = ENTITIES[e.toLowerCase()];
    if (named) return named;
    // acentos comuns: &aacute; &ccedil; &atilde; ...
    const acc = e.match(/^([a-z])(acute|grave|circ|tilde|uml|cedil)$/i);
    if (acc) {
      const marks = { acute: "́", grave: "̀", circ: "̂", tilde: "̃", uml: "̈", cedil: "̧" } as const;
      return (acc[1] + marks[acc[2].toLowerCase() as keyof typeof marks]).normalize("NFC");
    }
    return m;
  });
}

/**
 * HTML → texto legível (sem dependências): tira scripts, menus, rodapés e formulários; prefere <article>/<main>
 * quando têm texto suficiente; blocos viram parágrafos.
 */
export function htmlToText(html: string): { title: string | null; text: string } {
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
    null;
  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|canvas|nav|footer|header|aside|form|button|select)\b[\s\S]*?<\/\1>/gi, " ");
  const pick = (tag: string) => {
    const all = [...body.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((m) => m[1]);
    return all.sort((a, b) => b.length - a.length)[0];
  };
  const main = pick("article") ?? pick("main");
  if (main && strip(main).length > 500) body = main;
  const text = strip(body);
  return { title: title ? decodeEntities(title).replace(/\s+/g, " ").trim().slice(0, 200) || null : null, text };
}

function strip(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|section|article|main|li|ul|ol|h[1-6]|tr|table|blockquote|pre|figure|figcaption|dd|dt)>/gi, "\n\n")
      .replace(/<(h[1-6])\b[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

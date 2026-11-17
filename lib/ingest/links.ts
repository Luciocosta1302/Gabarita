import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { UserFacingError } from "@/lib/errors";

import { htmlToText, isPrivateAddress } from "./html";

/** Link como material: página da web (HTML ou texto), PDF por link, ou vídeo do YouTube (tratado à parte). */

const MAX_BYTES = 20 * 1024 * 1024; // mesmo limite dos arquivos enviados
const TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;
/** Nome genérico (sem dados do dono do app nem do aluno). */
const USER_AGENT = "Mozilla/5.0 (compatible; GabaritaBot/1.0; leitor de material de estudo)";

export type FetchedLink =
  | { kind: "pdf"; data: Uint8Array; finalUrl: string }
  | { kind: "page"; title: string | null; text: string; finalUrl: string };

/** Só para dev/testes: deixa buscar endereços da rede local (o servidor de teste roda em 127.0.0.1). */
const allowLocal = () => process.env.LINK_FETCH_ALLOW_LOCAL === "true";

/**
 * Proteção contra SSRF: só http(s), portas padrão, e o nome precisa apontar para endereço público
 * (nada de 127.0.0.1, rede interna, 169.254.x.x de metadados da nuvem etc.). Vale também para cada redirecionamento.
 */
async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UserFacingError("Link inválido.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UserFacingError("Use um link http ou https.");
  if (url.username || url.password) throw new UserFacingError("Link com usuário/senha não é aceito.");
  if (allowLocal()) return url;
  if (url.port && url.port !== "80" && url.port !== "443") throw new UserFacingError("Esse link usa uma porta não permitida.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addresses.length === 0) throw new UserFacingError("Não encontramos esse site. Confira o link.");
  if (addresses.some(isPrivateAddress)) throw new UserFacingError("Esse link aponta para um endereço interno e não pode ser lido.");
  return url;
}

async function readLimited(res: Response) {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new UserFacingError("O conteúdo do link passa de 20 MB.");
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new UserFacingError("O conteúdo do link passa de 20 MB.");
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return out;
}

/**
 * Busca segura (SSRF): segue até 5 redirecionamentos conferindo cada endereço; erro do site vira
 * mensagem para o aluno. Usada pelos links como material e pelas notícias (RSS).
 */
export async function safeFetch(raw: string, { accept, timeoutMs = TIMEOUT_MS }: { accept: string; timeoutMs?: number }) {
  let url = await assertPublicUrl(raw);
  let res: Response | null = null;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new UserFacingError("Não conseguimos abrir esse link (o site não respondeu).");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (i === MAX_REDIRECTS) throw new UserFacingError("O link redireciona vezes demais.");
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    break;
  }
  if (!res || !res.ok) {
    const s = res?.status;
    throw new UserFacingError(
      s === 401 || s === 403 ? "Esse site exige login ou bloqueia leitura automática. Copie o texto e cole como material." : `O site respondeu com erro (${s ?? "sem resposta"}).`,
    );
  }
  return { res, url };
}

/** Lê o corpo como texto respeitando o charset (limite de 20 MB). */
export async function readText(res: Response) {
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  const data = await readLimited(res);
  const charset = type.match(/charset=([\w-]+)/)?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8").decode(data);
  } catch {
    return new TextDecoder().decode(data);
  }
}

export async function fetchLink(raw: string): Promise<FetchedLink> {
  const { res, url } = await safeFetch(raw, { accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.5" });
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  const data = await readLimited(res);
  const finalUrl = url.toString();
  const isPdf = type.includes("application/pdf") || (data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46); // %PDF
  if (isPdf) return { kind: "pdf", data, finalUrl };
  if (type.includes("text/plain")) return { kind: "page", title: null, text: new TextDecoder().decode(data), finalUrl };
  if (type && !type.includes("html") && !type.includes("xml")) {
    throw new UserFacingError("Esse link não é uma página nem um PDF. Baixe o arquivo e envie pelo upload.");
  }
  const charset = type.match(/charset=([\w-]+)/)?.[1];
  let html: string;
  try {
    html = new TextDecoder(charset ?? "utf-8").decode(data);
  } catch {
    html = new TextDecoder().decode(data);
  }
  const { title, text } = htmlToText(html);
  return { kind: "page", title, text, finalUrl };
}

/** Título de um vídeo do YouTube pelo oEmbed público (sem chave). Falhou = null. */
export async function youtubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string };
    return j.title?.trim().slice(0, 200) || null;
  } catch {
    return null;
  }
}

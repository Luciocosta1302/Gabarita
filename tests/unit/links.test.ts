import { describe, expect, it } from "vitest";

import { decodeEntities, htmlToText, isPrivateAddress, youtubeId } from "@/lib/ingest/html";
import { timestampSeconds, videoAt } from "@/lib/text/timestamps";
import { createUploadSchema } from "@/lib/validation/upload";

describe("links: YouTube", () => {
  it("reconhece os formatos de link", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      "https://youtube.com/watch?v=jNQXAC9IVRw&t=30s",
      "https://m.youtube.com/watch?v=jNQXAC9IVRw",
      "https://youtu.be/jNQXAC9IVRw?si=abc",
      "https://www.youtube.com/shorts/jNQXAC9IVRw",
      "https://www.youtube.com/embed/jNQXAC9IVRw",
      "https://www.youtube.com/live/jNQXAC9IVRw",
    ]) {
      expect(youtubeId(u), u).toBe("jNQXAC9IVRw");
    }
  });
  it("não confunde com outros sites nem ids inválidos", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://evil.com/watch?v=jNQXAC9IVRw")).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=curto")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@canal")).toBeNull();
    expect(youtubeId("não é link")).toBeNull();
  });
});

describe("links: endereços internos (SSRF)", () => {
  it("bloqueia loopback, rede interna, metadados da nuvem e IPv6 local", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("libera endereços públicos", () => {
    for (const ip of ["8.8.8.8", "142.250.79.46", "172.32.0.1", "2800:3f0:4001:80b::200e"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("links: HTML → texto", () => {
  it("prefere o artigo e tira menu, scripts e rodapé", () => {
    const longo = "A mitose é a divisão celular que gera duas células iguais. ".repeat(12);
    const html = `<html><head><title>Mitose &amp; Meiose – Bio</title><script>var x = "lixo";</script></head>
      <body><nav><a>Início</a><a>Contato</a></nav>
      <article><h1>Mitose</h1><p>${longo}</p><ul><li>Prófase</li><li>Metáfase</li></ul><p>Fase final: telof&aacute;se &#233; &#x00E9; ok.</p></article>
      <footer>Copyright 2026</footer></body></html>`;
    const { title, text } = htmlToText(html);
    expect(title).toBe("Mitose & Meiose – Bio");
    expect(text).toContain("A mitose é a divisão celular");
    expect(text).toContain("- Prófase");
    expect(text).toContain("telofáse é é ok");
    expect(text).not.toMatch(/lixo|Contato|Copyright/);
  });
  it("usa og:title quando existe", () => {
    expect(htmlToText(`<meta property="og:title" content="Título bom"><title>ruim</title><p>x</p>`).title).toBe("Título bom");
  });
  it("entidades", () => {
    expect(decodeEntities("&ccedil;&atilde;o &lt;b&gt; &nbsp;&#9731;")).toBe("ção <b>  ☃");
  });
});

describe("links: validação do envio", () => {
  const base = { kind: "link", subject_id: "11111111-1111-4111-8111-111111111111" };
  it("completa https:// e recusa outros protocolos", () => {
    const ok = createUploadSchema.safeParse({ ...base, url: "pt.wikipedia.org/wiki/Mitose" });
    expect(ok.success && ok.data.kind === "link" && ok.data.url).toBe("https://pt.wikipedia.org/wiki/Mitose");
    expect(createUploadSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
    expect(createUploadSchema.safeParse({ ...base, url: "file:///etc/passwd" }).success).toBe(false);
    expect(createUploadSchema.safeParse({ ...base, url: "ftp://x.com/a" }).success).toBe(false);
  });
});

describe("tempos da transcrição", () => {
  it("[mm:ss] e [h:mm:ss] viram segundos", () => {
    expect(timestampSeconds("[01:30]")).toBe(90);
    expect(timestampSeconds("[1:02:03]")).toBe(3723);
    expect(timestampSeconds("[00:75]")).toBeNull();
    expect(timestampSeconds("01:30")).toBeNull();
  });
  it("link no ponto do vídeo", () => {
    expect(videoAt("https://www.youtube.com/watch?v=jNQXAC9IVRw", 90)).toBe("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=90s");
  });
});

describe("transcrição de vídeo em partes", () => {
  it("transcrição com uma linha por fala (sem linha em branco) vira várias partes", async () => {
    const { splitPseudoPages } = await import("@/lib/ingest/extract");
    const lines = Array.from({ length: 200 }, (_, i) => `[${String(Math.floor(i / 12)).padStart(2, "0")}:${String((i * 5) % 60).padStart(2, "0")}] Fala número ${i} sobre seno, cosseno e tangente no triângulo retângulo.`);
    const ex = splitPseudoPages(lines.join("\n"));
    expect(ex.pageCount).toBeGreaterThan(3);
    for (const p of ex.pages) expect(p.text.length).toBeLessThanOrEqual(3200);
    expect(ex.pages.map((p) => p.text).join("\n")).toContain("Fala número 199");
  });
});

describe("duração do vídeo do YouTube", () => {
  it("lê lengthSeconds ou a meta de duração da página", async () => {
    const { parseYoutubeDuration } = await import("@/lib/ingest/links");
    expect(parseYoutubeDuration('..."lengthSeconds":"996","keywords"...')).toBe(996);
    expect(parseYoutubeDuration('<meta itemprop="duration" content="PT1H2M3S">')).toBe(3723);
    expect(parseYoutubeDuration('<meta itemprop="duration" content="PT16M36S">')).toBe(996);
    expect(parseYoutubeDuration("<html>sem nada</html>")).toBeNull();
  });
});

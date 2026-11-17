import { describe, expect, it } from "vitest";

import { customFeedKey, localFeed, NEWS_SOURCES, suggestedSources, tagsFor } from "@/lib/news/catalog";
import { newsPrefsSchema } from "@/lib/news/schema";
import { cleanSnippet, domainOf, feedTitle, parseFeed } from "@/lib/news/rss";
import { norm, verifySummary } from "@/lib/news/verify";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Educação</title>
<item><title><![CDATA[Inscrições do ENEM 2027 vão até 12 de dezembro]]></title><link>https://exemplo.com/enem?a=1&amp;b=2</link>
<description><![CDATA[<p>O <b>Inep</b> divulgou o edital &amp; o cronograma.</p><img src="x.jpg">]]></description><pubDate>Mon, 16 Nov 2026 10:00:00 -0300</pubDate></item>
<item><title>Sem link</title></item>
<item><title>Link perigoso</title><link>javascript:alert(1)</link></item>
<item><title>Concurso do INSS - Folha</title><link>https://news.google.com/x</link><source url="https://folha.uol.com.br">Folha</source></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Bolsas de mestrado abertas</title>
<link rel="alternate" href="https://blog.exemplo.com/bolsas"/><updated>2026-11-15T12:00:00Z</updated><summary>Universidade abre 40 vagas.</summary></entry></feed>`;

describe("notícias: leitura de feeds", () => {
  it("RSS: título, link, trecho limpo e data; ignora itens sem link ou com link perigoso", () => {
    const items = parseFeed(RSS);
    expect(items.map((i) => i.title)).toEqual(["Inscrições do ENEM 2027 vão até 12 de dezembro", "Concurso do INSS - Folha"]);
    expect(items[0].url).toBe("https://exemplo.com/enem?a=1&b=2");
    expect(items[0].snippet).toBe("O Inep divulgou o edital & o cronograma.");
    expect(items[0].publishedAt?.toISOString()).toBe("2026-11-16T13:00:00.000Z");
    expect(items[1].source).toBe("Folha");
    // agregador (Google Notícias): o site de origem vem do <source url>
    expect(domainOf(items[1].sourceUrl)).toBe("folha.uol.com.br");
    expect(domainOf("https://www.g1.globo.com/x")).toBe("g1.globo.com");
  });
  it("nome do jornal vem do feed", () => {
    expect(feedTitle(RSS)).toBe("Educação");
    expect(feedTitle(ATOM)).toBeNull();
  });
  it("Atom", () => {
    expect(parseFeed(ATOM)).toEqual([
      { title: "Bolsas de mestrado abertas", url: "https://blog.exemplo.com/bolsas", snippet: "Universidade abre 40 vagas.", publishedAt: new Date("2026-11-15T12:00:00Z"), source: null, sourceUrl: null },
    ]);
  });
  it("trecho longo é cortado numa palavra", () => {
    expect(cleanSnippet("palavra ".repeat(100), 30)).toMatch(/^palavra( palavra)*…$/);
  });
});

describe("notícias: etiquetas, fontes e preferências", () => {
  it("etiquetas automáticas viram #hashtags", () => {
    expect(tagsFor("Inscrições do ENEM e do SISU abertas; resultado sai em março")).toEqual(["enem", "sisu", "inscricoes", "resultado"]);
    expect(tagsFor("Edital do concurso da Receita")).toEqual(["concurso", "edital"]);
    expect(tagsFor("Previsão do tempo")).toEqual([]);
  });
  it("fontes sugeridas pelo objetivo", () => {
    expect(suggestedSources("concurso")).toContain("g1-concursos");
    expect(suggestedSources("concurso")).not.toContain("inep");
    expect(suggestedSources(null)).toHaveLength(NEWS_SOURCES.length);
  });
  it("região usa a busca do Google Notícias pelo estado ou cidade", () => {
    const f = localFeed("SP", "Campinas", "concurso");
    expect(f.name).toBe("Notícias de Campinas");
    expect(decodeURIComponent(f.url)).toContain('(concurso OR edital) "Campinas"');
    expect(localFeed("BA", null, null).name).toBe("Notícias de Bahia");
    expect(customFeedKey("https://a.com/feed")).toBe(customFeedKey("https://a.com/feed"));
  });
  it("preferências: fontes conhecidas, até 5 links e estado válido", () => {
    expect(newsPrefsSchema.safeParse({ sources: ["g1-educacao"], custom_feeds: ["site.com/feed"], state: "SP", city: "" }).data).toMatchObject({
      custom_feeds: ["https://site.com/feed"],
      city: null,
    });
    expect(newsPrefsSchema.safeParse({ sources: ["inventada"], custom_feeds: [], state: null, city: null }).success).toBe(false);
    expect(newsPrefsSchema.safeParse({ sources: [], custom_feeds: ["javascript:alert(1)"], state: null, city: null }).success).toBe(false);
    expect(newsPrefsSchema.safeParse({ sources: [], custom_feeds: [], state: "XX", city: null }).success).toBe(false);
  });
});

describe("resumo conferido (contra notícia inventada)", () => {
  const texto = "O Inep confirmou nesta segunda-feira que as inscrições do Enem 2027 vão até 12/12. A taxa será de R$ 85,00 e quem estuda em escola pública tem isenção.";
  it("mantém só frases com trecho literal no texto e números que aparecem nele", () => {
    const r = verifySummary(
      {
        points: [
          { text: "Inscrições do ENEM 2027 vão até 12/12.", evidence: "as inscrições do Enem 2027 vão até 12/12" },
          { text: "A taxa é de R$ 85,00.", evidence: "A taxa será de R$ 85,00" },
          // trecho que não existe no texto
          { text: "O prazo foi prorrogado.", evidence: "o prazo foi prorrogado por mais uma semana" },
          // trecho existe, mas o número da frase foi inventado
          { text: "São 3 milhões de inscritos.", evidence: "quem estuda em escola pública tem isenção" },
        ],
        dates: [{ text: "Inscrições até 12/12", evidence: "vão até 12/12" }],
      },
      texto,
      false,
    );
    expect(r.points.map((p) => p.text)).toEqual(["Inscrições do ENEM 2027 vão até 12/12.", "A taxa é de R$ 85,00."]);
    expect(r.dates).toHaveLength(1);
    expect(r.dropped).toBe(2);
    expect(r.v).toBe(2);
  });
  it("trecho curto demais não vale como prova; acento, aspas e espaços não atrapalham", () => {
    expect(verifySummary({ points: [{ text: "Enem.", evidence: "Enem" }], dates: [] }, texto, false).points).toHaveLength(0);
    expect(norm("  “Inscrições”   ATÉ ") ).toBe("inscricoes ate");
    expect(verifySummary({ points: [{ text: "Escola pública tem isenção.", evidence: "QUEM ESTUDA EM ESCOLA PUBLICA tem isencao" }], dates: [] }, texto, true).points).toHaveLength(1);
  });
});

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import { signup } from "./helpers";

// Notícias (IA de teste): o aluno escolhe objetivo e fontes; um "jornal" local serve o RSS.
test("notícias: escolhe fontes, filtra por período, #etiqueta e busca, e pede o resumo", async ({ page }) => {
  test.setTimeout(120_000);
  const now = new Date().toUTCString();
  const article = `<article>${"<p>O Inep confirmou que as inscrições do ENEM vão até 12 de dezembro, pela Página do Participante.</p>".repeat(8)}</article>`;
  let base = "";
  const server = createServer((req, res) => {
    if (req.url === "/feed.xml") {
      const items = [
        ["Inscrições do ENEM vão até 12 de dezembro", "/a/enem", "O Inep divulgou o cronograma."],
        ["Edital do concurso da Receita sai em janeiro", "/a/concurso", "São 500 vagas."],
        ["Escola municipal ganha laboratório", "/a/escola", "Projeto de ciências."],
      ]
        .map(([t, path, d]) => `<item><title>${t}</title><link>${base}${path}</link><description>${d}</description><pubDate>${now}</pubDate></item>`)
        .join("");
      return res.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8" }).end(`<rss version="2.0"><channel><title>Jornal Local</title>${items}</channel></rss>`);
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(`<title>Notícia</title>${article}`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    await signup(page, "Nina Notícias", "e2e-news");
    await page.getByRole("link", { name: "Notícias" }).first().click();
    await expect(page).toHaveURL(/\/noticias$/);
    const setup = page.getByTestId("news-setup");
    await setup.getByRole("button", { name: /Concursos/ }).click();
    // fontes do catálogo sugeridas pelo objetivo vêm marcadas; desmarca para testar só o jornal local
    const checked = setup.getByRole("checkbox", { checked: true });
    while ((await checked.count()) > 0) await checked.first().uncheck();
    await setup.getByLabel("Link do RSS").fill(`${base}/feed.xml`);
    await setup.getByRole("button", { name: "Adicionar" }).click();
    await setup.getByRole("button", { name: "Salvar e ver notícias" }).click();

    const list = page.getByTestId("news-list");
    await expect(list.getByTestId("news-item")).toHaveCount(3, { timeout: 30_000 });
    await expect(list).toContainText("Inscrições do ENEM");

    // #etiqueta
    await page.getByTestId("news-tags").getByRole("link", { name: "#enem" }).click();
    await expect(list.getByTestId("news-item")).toHaveCount(1);
    // período + busca
    await page.goto("/noticias?periodo=hoje");
    await expect(page.getByTestId("news-periods").getByRole("link", { name: "Hoje" })).toHaveAttribute("aria-current", "true");
    await page.getByPlaceholder(/Buscar/).fill("concurso");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(list.getByTestId("news-item")).toHaveCount(1);
    await expect(list).toContainText("Edital do concurso");

    // título abre o original; resumo da Fuku
    await expect(list.getByRole("link", { name: /Edital do concurso/ })).toHaveAttribute("href", `${base}/a/concurso`);
    // origem sempre à vista: nome do jornal (do próprio feed) e site
    await expect(list.getByTestId("news-source")).toContainText("Jornal Local");
    await expect(list.getByTestId("news-source")).toContainText("127.0.0.1");
    await expect(list.getByTestId("news-original")).toHaveAttribute("href", `${base}/a/concurso`);
    await list.getByTestId("news-summarize").click();
    const summary = page.getByTestId("news-summary");
    // só a frase com trecho literal no texto fica; a inventada ("999 vagas") é descartada
    await expect(summary).toContainText("Resumo de teste conferido com o texto.");
    await expect(summary).toContainText("“O Inep confirmou");
    await expect(summary).not.toContainText("999");
    await expect(page.getByTestId("news-summary-note")).toContainText("Tirei 1 frase que não consegui conferir");
    // link da notícia no fim do resumo
    await expect(page.getByTestId("news-summary").getByTestId("news-link").getByRole("link")).toHaveAttribute("href", `${base}/a/concurso`);

    // ícone da fonte: só para sites das notícias/catálogo; nome inválido recusado
    expect((await page.request.get("/api/news/icon?d=site-qualquer.com")).status()).toBe(404);
    expect((await page.request.get("/api/news/icon?d=../etc")).status()).toBe(400);
  } finally {
    server.close();
  }
});

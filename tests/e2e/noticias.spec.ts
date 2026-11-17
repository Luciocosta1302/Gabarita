import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import { signup } from "./helpers";

// Notícias (IA de teste): o aluno escolhe objetivo e fontes; um "jornal" local serve o RSS.
test("notícias: escolhe fontes, filtra por período, #etiqueta e busca, e mostra a fonte de cada uma", async ({ page }) => {
  test.setTimeout(120_000);
  const now = new Date().toUTCString();
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
    res.writeHead(404).end();
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
    // sem resumo de IA: só a notícia original, com a fonte e o link no fim
    await expect(list.getByTestId("news-summarize")).toHaveCount(0);
    await expect(list.getByTestId("news-link").getByRole("link")).toHaveAttribute("href", `${base}/a/concurso`);
    await expect(list.getByTestId("news-link")).toContainText("Fonte: Jornal Local");
    // ícone da fonte: só para sites das notícias/catálogo; nome inválido recusado
    expect((await page.request.get("/api/news/icon?d=site-qualquer.com")).status()).toBe(404);
    expect((await page.request.get("/api/news/icon?d=../etc")).status()).toBe(400);
  } finally {
    server.close();
  }
});

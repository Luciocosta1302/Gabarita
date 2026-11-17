import { expect, test } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { signup } from "./helpers";

// Páginas da proposta (IA de teste): Biblioteca + chat por documento, Anotações, Diário,
// Desempenho, Conquistas e Comunidade.
test("biblioteca, anotações, diário, desempenho, conquistas e comunidade", async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await (await browser.newContext()).newPage();
  await signup(page, "Ana Extra", "e2e6a");

  await page.getByLabel("Matéria / prova").fill("Biologia");
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await page.getByTestId("subject-list").getByText("Biologia").click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(6)) });
  await page.getByRole("button", { name: "Enviar material" }).click();
  await expect(page.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });

  // Biblioteca: pasta, busca dentro do texto, chat com um documento
  await page.getByRole("link", { name: "Biblioteca" }).click();
  await expect(page.getByTestId("library-item")).toHaveCount(1);
  await page.getByLabel("Buscar nos materiais").fill("parágrafo 3");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByTestId("library-hits").getByTestId("source-quote").first()).toHaveText("parágrafo 3");
  await page.getByLabel("por sentido").check();
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByTestId("library-hits")).toContainText("parecido");
  await page.getByLabel("por sentido").uncheck();
  await page.getByLabel("Buscar nos materiais").fill("");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: /Conversar com este documento/ }).click();
  await expect(page.getByTestId("chat-doc")).toBeVisible();
  await page.getByLabel("Sua pergunta").fill("O que cai na prova?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByTestId("chat-citations").first()).toContainText("bio");
  // a conversa fica salva
  await page.reload();
  await expect(page.getByTestId("chat-messages")).toContainText("O que cai na prova?");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Apagar conversa" }).click();
  await expect(page.getByTestId("chat-messages")).not.toContainText("O que cai na prova?");
  await page.reload();
  await expect(page.getByTestId("chat-messages")).not.toContainText("O que cai na prova?");

  // Anotações: cria, escreve (salva sozinho), vê formatado, sobrevive ao recarregar
  await page.getByRole("link", { name: "Anotações" }).click();
  await page.getByRole("button", { name: "+ Nova anotação" }).click();
  await expect(page.getByTestId("note-editor")).toBeVisible();
  await page.getByLabel("Título").fill("Resumo de mitose");
  await page.getByLabel("Anotação").fill("# Mitose\n- **prófase**\n- metáfase");
  await expect(page.getByTestId("note-status")).toHaveText("Salvo ✓", { timeout: 10_000 });
  await page.getByRole("tab", { name: "Ver formatado" }).click();
  await expect(page.getByTestId("note-preview").locator("strong")).toHaveText("prófase");
  await page.reload();
  await expect(page.getByTestId("notes-list")).toContainText("Resumo de mitose");
  await expect(page.getByLabel("Anotação")).toHaveValue(/metáfase/);

  // Diário: dois registros → acompanhamento da semana
  await page.getByRole("link", { name: "Diário" }).click();
  for (const [learned, mood] of [["Mitose tem quatro fases", "Bem"], ["Meiose reduz cromossomos pela metade", "Cansado"]]) {
    await page.getByLabel("O que você aprendeu hoje?").fill(learned);
    await page.getByRole("radio", { name: mood }).click();
    await page.getByRole("button", { name: "Salvar registro" }).click();
    await expect(page.getByText("Registro salvo ✓")).toBeVisible();
  }
  await expect(page.getByTestId("journal-entries").locator("li")).toHaveCount(2);
  await page.getByRole("button", { name: "Gerar acompanhamento da semana" }).click();
  await expect(page.getByTestId("journal-reflection")).toContainText("2 registros");

  // Desempenho e Conquistas
  await page.getByRole("link", { name: "Desempenho" }).click();
  await expect(page.getByTestId("recommendations")).toBeVisible();
  await expect(page.getByTestId("chart-bars")).toBeVisible();
  await page.getByRole("link", { name: "Conquistas" }).click();
  await expect(page.getByTestId("level")).toContainText("Nível");
  await expect(page.getByTestId("badges").locator('[data-unlocked="true"]')).toContainText(["Biblioteca aberta", "Querido diário"]);

  // Comunidade: Ana posta, Beto responde e curte
  await page.getByRole("link", { name: "Comunidade" }).click();
  await page.getByRole("button", { name: "+ Novo post" }).click();
  await page.getByLabel("Título").fill("Dica de mitose");
  await page.getByLabel("Texto").fill("Use PMAT para lembrar as fases.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByTestId("post")).toContainText("Ana Extra");
  const postUrl = new URL(page.url()).pathname;

  const beto = await (await browser.newContext()).newPage();
  await signup(beto, "Beto Extra", "e2e6b");
  await beto.goto(postUrl);
  await beto.getByLabel("Comentário").fill("Valeu, ajudou!");
  await beto.getByRole("button", { name: "Comentar" }).click();
  await expect(beto.getByTestId("comments")).toContainText("Beto Extra");
  await beto.getByTestId("like").click();
  await expect(beto.getByTestId("like")).toHaveText("♥ 1");
  await expect(beto.getByTestId("post").getByRole("button", { name: "Apagar" })).toHaveCount(0);
  await beto.getByTestId("post").getByRole("button", { name: "Denunciar" }).click();
  await beto.getByRole("button", { name: "Spam / propaganda" }).click();
  await expect(beto.getByText("Denúncia enviada. Obrigado!")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("comments")).toContainText("Valeu, ajudou!");
  await expect(page.getByTestId("like")).toHaveText("♥ 1");

  // Editar a matéria: data da prova gera o plano; apagar leva de volta ao início
  await page.getByRole("link", { name: "Início" }).click();
  // conquistas ganhas depois da última visita a /conquistas são anunciadas uma vez no Início
  await expect(page.getByTestId("new-achievements")).toContainText("Na comunidade");
  await page.reload();
  await expect(page.getByTestId("new-achievements")).toHaveCount(0);
  await page.getByTestId("subject-list").getByText("Biologia").click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  await page.getByTestId("edit-subject").locator("summary").click();
  await page.getByLabel("Nome").fill("Biologia celular");
  const inTen = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Data da prova").fill(inTen);
  await page.getByLabel("Horas por dia").fill("2");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Biologia celular" })).toBeVisible();
  await expect(page.getByTestId("plan-card")).toContainText("Faltam");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Apagar matéria" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Biologia celular")).toHaveCount(0);
});

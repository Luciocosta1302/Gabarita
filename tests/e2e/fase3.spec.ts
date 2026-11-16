import sharp from "sharp";
import { expect, test } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";

// Fase 3 (com IA de teste): Prova do Professor, discursiva com rubrica, Feynman, foto da questão,
// áudio de aula vira material e resumo em áudio.
test("diferenciais da Fase 3", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/signup");
  await page.getByLabel("Nome").fill("Aluna Fase Três");
  await page.getByLabel("E-mail").fill(`e2e4-${Date.now()}@teste.gabarita.local`);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard");
  await page.getByLabel("Matéria / prova").fill("Biologia");
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await page.getByTestId("subject-list").getByText("Biologia").click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  const subjectUrl = page.url();

  // material + áudio de aula
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(10)) });
  await page.getByRole("button", { name: "Enviar material" }).click();
  await expect(page.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({ name: "aula.mp3", mimeType: "audio/mpeg", buffer: Buffer.alloc(2000) });
  await page.getByRole("button", { name: "Enviar material" }).click();
  const audioRow = page.getByTestId("material-list").locator("li").filter({ hasText: "Áudio da aula" });
  await expect(audioRow.getByTestId("material-status")).toHaveText("Pronto", { timeout: 60_000 });

  // D13: resumo em áudio
  await page.getByTestId("material-list").getByRole("link", { name: "bio" }).click();
  await expect(page).toHaveURL(/\/materials\//);
  await page.getByRole("button", { name: "Gerar resumo" }).click();
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("speak-summary").or(page.getByText("Seu navegador não lê textos"))).toBeVisible();

  // D4: Prova do Professor
  await page.goto(subjectUrl);
  await page.getByRole("link", { name: /Prova do Professor/ }).click();
  await expect(page).toHaveURL(/\/professor$/);
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({
    name: "p1-2025.pdf",
    mimeType: "application/pdf",
    buffer: makePdf(["Prova 1. Questão 1: Sobre a fotossíntese, é correto afirmar que ocorre nos cloroplastos. Questão 2: A respiração celular libera ATP."]),
  });
  await page.getByRole("button", { name: "Enviar prova" }).click();
  await expect(page.getByTestId("teacher-profile")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("likely-topics").locator("li").first()).toBeVisible();
  await page.getByRole("button", { name: "Gerar 10 questões no estilo do professor" }).click();
  await expect(page).toHaveURL(/\/quiz\//, { timeout: 60_000 });
  await expect(page.getByTestId("question-card").getByRole("radio").filter({ hasText: /^[A-E]\)/ })).toHaveCount(5);

  // D10: discursiva com rubrica
  await page.goto(subjectUrl);
  await page.getByLabel("Quantidade").fill("1");
  await page.getByLabel("Estilo da banca").selectOption("discursiva");
  await page.getByRole("button", { name: "Gerar questões" }).click();
  await expect(page).toHaveURL(/\/quiz\//, { timeout: 60_000 });
  const card = page.getByTestId("question-card");
  await card.getByLabel("Sua resposta").fill("A respiração celular acontece nas mitocôndrias e libera energia em forma de ATP, que a célula usa para trabalhar.");
  await card.getByRole("radio", { name: "Acho que sei" }).click();
  await card.getByRole("button", { name: "Responder" }).click();
  await expect(card.getByTestId("open-feedback")).toBeVisible({ timeout: 30_000 });
  await expect(card.getByTestId("open-score")).toHaveText(/\d/);
  await expect(card.getByTestId("open-feedback")).toContainText("Conteúdo");
  await page.getByRole("button", { name: "Ver resultado" }).click();
  await expect(page.getByTestId("quiz-review")).toContainText("Nota");

  // D9: Modo Feynman (texto)
  await page.goto(subjectUrl);
  await page.getByRole("link", { name: /Modo Feynman/ }).click();
  await expect(page).toHaveURL(/\/feynman$/);
  await page.getByLabel("Sua explicação").fill("O tópico fala que a fotossíntese ocorre nos cloroplastos e transforma energia luminosa em energia química, tipo uma usina.");
  await page.getByRole("button", { name: "Ver o que acertei e o que faltou" }).click();
  await expect(page.getByTestId("feynman-feedback")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("feynman-history").locator("li")).toHaveCount(1);

  // D11: foto da questão
  await page.getByRole("link", { name: "Foto da questão" }).click();
  await expect(page).toHaveURL(/\/resolver$/);
  const png = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fafafa" } }).png().toBuffer();
  await page.getByLabel("Foto da questão").setInputFiles({ name: "questao.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Resolver passo a passo" }).click();
  await expect(page.getByTestId("photo-answer")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("photo-matches").getByRole("link").first()).toContainText("Biologia");
});

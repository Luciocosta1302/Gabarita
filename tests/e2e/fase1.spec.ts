import { expect, test, type Page } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";

// Critério de pronto da Fase 1 (com IA de teste, AI_PROVIDER=mock):
// subir um PDF de 20 páginas, gerar 10 questões, cada uma abre o trecho certo;
// errar uma e ela aparecer no caderno com questão parecida.

async function answer(page: Page, { wrong, confidence }: { wrong: boolean; confidence: string }) {
  const card = page.getByTestId("question-card").last();
  const options = card.getByRole("radiogroup", { name: "Alternativas" }).getByRole("radio");
  // No mock, as alternativas erradas começam com "Alternativa incorreta".
  const target = wrong
    ? options.filter({ hasText: /^.\)Alternativa incorreta/ }).first()
    : options.filter({ hasNotText: "Alternativa incorreta" }).first();
  await target.click();
  await card.getByRole("radio", { name: confidence }).click();
  await card.getByRole("button", { name: "Responder" }).click();
  await expect(card.getByTestId("answer-feedback")).toBeVisible();
}

test("PDF de 20 páginas → 10 questões com fonte → erro vai para o caderno com questão parecida", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e1-${Date.now()}@teste.gabarita.local`;

  await page.goto("/signup");
  await page.getByLabel("Nome").fill("Aluno Fase Um");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: /Aluno!/ })).toBeVisible();

  await page.getByLabel("Matéria / prova").fill("Biologia — P2");
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await page.getByTestId("subject-list").getByText("Biologia — P2").click();
  await expect(page.getByRole("heading", { name: "Biologia — P2" })).toBeVisible();

  // --- upload ------------------------------------------------------------------
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({
    name: "biologia.pdf",
    mimeType: "application/pdf",
    buffer: makePdf(studyPages(20)),
  });
  await page.getByRole("button", { name: "Enviar material" }).click();
  const materials = page.getByTestId("material-list");
  await expect(materials.getByText("biologia")).toBeVisible();
  await expect(materials.getByTestId("material-status")).toHaveText("Pronto", { timeout: 60_000 });
  await expect(materials.getByText("PDF · 20 páginas")).toBeVisible();

  // --- gerar 10 questões --------------------------------------------------------
  await page.getByLabel("Quantidade").fill("10");
  await page.getByRole("button", { name: "Gerar questões" }).click();
  await expect(page).toHaveURL(/\/quiz\//, { timeout: 60_000 });
  await expect(page.getByText("Questão 1 de 10")).toBeVisible();

  // A 1ª errada com "tenho certeza"; as outras certas.
  for (let i = 0; i < 10; i++) {
    await answer(page, { wrong: i === 0, confidence: i === 0 ? "Tenho certeza" : "Acho que sei" });
    if (i === 0) await expect(page.getByTestId("answer-feedback")).toContainText("Errou");
    await page.getByRole("button", { name: i === 9 ? "Ver resultado" : "Próxima →" }).click();
  }

  await expect(page.getByTestId("quiz-score")).toHaveText("9 de 10 acertos");
  await expect(page.getByText('Quando você marca "tenho certeza", erra 100% das vezes (1 de 1).')).toBeVisible();

  // --- D1: cada questão abre o trecho certo --------------------------------------
  const links = page.getByTestId("quiz-review").getByTestId("source-link");
  await expect(links).toHaveCount(10);
  const targets = await links.evaluateAll((els) =>
    els.map((a) => ({ href: a.getAttribute("href")!, label: a.textContent ?? "" })),
  );
  const quizUrl = page.url();
  for (const t of targets) {
    const pageNum = t.label.match(/p\. (\d+)/)?.[1];
    expect(pageNum, `link sem página: ${t.label}`).toBeTruthy();
    await page.goto(t.href);
    await expect(page.getByTestId("focus-chunk")).toBeVisible();
    await expect(page.getByTestId("focus-page")).toContainText(`Página ${pageNum}`);
    // a citação da questão está destacada dentro do trecho
    await expect(page.getByTestId("focus-chunk").getByTestId("source-quote")).toBeVisible();
  }

  // --- D6: caderno de erros com questão parecida --------------------------------
  await page.goto("/errors");
  const entry = page.getByTestId("error-entry");
  await expect(entry).toHaveCount(1);
  await expect(entry.getByTestId("why-wrong")).toBeVisible({ timeout: 30_000 });
  const followup = entry.getByTestId("followup");
  await expect(followup).toBeVisible();
  await answer(page, { wrong: false, confidence: "Tenho certeza" });
  await expect(followup.getByTestId("answer-feedback")).toContainText("Acertou");
  await page.reload();
  await expect(page.getByText("Resolvidos (1)")).toBeVisible();

  // --- chat, resumo e flashcards ----------------------------------------------------
  await page.goto(quizUrl);
  await page.getByRole("link", { name: "← Voltar para a matéria" }).click();
  await page.getByRole("link", { name: /Conversar com o material/ }).click();
  await page.getByLabel("Sua pergunta").fill("Onde ocorre a fotossíntese?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByTestId("chat-citations")).toContainText("biologia, p.");

  await page.goBack();
  await page.getByTestId("material-list").getByRole("link", { name: "biologia" }).click();
  await page.getByRole("button", { name: "Gerar resumo" }).click();
  await expect(page.getByTestId("summary")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("link", { name: "← Voltar para a matéria" }).click();
  await page.getByRole("link", { name: /Flashcards/ }).click();
  await page.getByRole("button", { name: "Criar flashcards" }).click();
  await expect(page.getByTestId("flashcard-list").getByRole("button")).toHaveCount(10);
});

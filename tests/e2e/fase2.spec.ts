import { expect, test } from "@playwright/test";

import { addDays, todayBR } from "../../lib/dates";
import { makePdf, studyPages } from "../fixtures/make-pdf";
import { skipTour } from "./helpers";

// Critério de pronto da Fase 2: criar matéria com data da prova daqui 14 dias gera plano;
// marcar um dia como não feito redistribui as tarefas. (+ tópicos, simulado e revisão, com IA de teste)
test("plano de 14 dias se reorganiza; tópicos, simulado e revisão", async ({ page }) => {
  test.setTimeout(180_000);
  const today = todayBR();

  await page.goto("/signup");
  await page.getByLabel("Nome").fill("Aluna Fase Dois");
  await page.getByLabel("E-mail").fill(`e2e2-${Date.now()}@teste.gabarita.local`);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await skipTour(page);

  await page.getByLabel("Nome da pasta").fill("Biologia — ENEM");
  await page.getByText("Tem prova marcada?").click();
  await page.getByLabel("Data da prova").fill(addDays(today, 14));
  await page.getByLabel("Horas por dia").fill("2");
  await page.getByLabel("Estilo da prova").selectOption("enem");
  await page.getByRole("button", { name: "Criar pasta" }).click();
  await expect(page.getByTestId("today-tasks")).toContainText("Enviar o material da prova");
  await page.getByTestId("subject-list").getByText("Biologia — ENEM").click();

  // --- plano de 14 dias -----------------------------------------------------------
  await page.getByTestId("plan-card").click();
  await expect(page.getByTestId("plan-countdown")).toContainText("Faltam 14 dias");
  const days = page.getByTestId("plan-day");
  await expect(days).toHaveCount(14);
  const todayCard = page.locator(`[data-testid="plan-day"][data-date="${today}"]`);
  const movedTitles = await todayCard.locator('[data-testid="plan-task"]:not([data-kind="review"])').allTextContents();
  expect(movedTitles.length).toBeGreaterThan(0);

  // --- "não fiz este dia" redistribui ------------------------------------------------
  await todayCard.getByRole("button", { name: "Não fiz este dia" }).click();
  await expect(todayCard).toHaveAttribute("data-status", "missed");
  await expect(todayCard.locator('[data-testid="plan-task"]:not([data-kind="review"])')).toHaveCount(0);
  const later = page.locator(`[data-testid="plan-day"]:not([data-date="${today}"])`);
  await expect(later.getByText(/veio de/)).toHaveCount(movedTitles.length);
  await expect(later.getByText("Enviar o material da prova")).toBeVisible();

  // --- material → tópicos → plano por tópico ------------------------------------
  await page.getByRole("link", { name: "← Biologia — ENEM" }).click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  await page.getByLabel("Escolher arquivo").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(10)) });
  await page.getByRole("button", { name: "Enviar material" }).click();
  await expect(page.getByTestId("material-status")).toHaveText("Pronto", { timeout: 60_000 });
  await expect(page.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("topic-mastery").first()).toHaveText("—");

  await page.getByTestId("plan-card").click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByText(/Estudar Tópico 1/).first()).toBeVisible();

  // --- simulado cronometrado (ENEM, 5 alternativas) ---------------------------------
  await page.getByRole("link", { name: "← Biologia — ENEM" }).click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  await page.getByLabel("Questões", { exact: true }).fill("5");
  await expect(page.getByText("Tempo: 15 min")).toBeVisible();
  await page.getByRole("button", { name: "Criar simulado" }).click();
  await expect(page).toHaveURL(/\/quiz\//, { timeout: 60_000 });
  await page.getByRole("button", { name: "Começar simulado" }).click();
  await expect(page.getByTestId("simulado-timer")).toContainText(/1[45]:\d\d/);

  const q = page.getByTestId("simulado-question");
  for (let i = 0; i < 3; i++) {
    await expect(q.getByRole("radio").filter({ hasText: /^[A-E]\)/ })).toHaveCount(5);
    await q.getByRole("radio").first().click();
    await q.getByRole("radio", { name: "Acho que sei" }).click();
    await q.getByRole("button", { name: "Próxima →" }).click();
  }
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Entregar simulado" }).click();
  const report = page.getByTestId("simulado-report");
  await expect(report).toBeVisible();
  await expect(report).toContainText("Erradas / em branco");
  await expect(report).toContainText(/\/ 2/); // 2 em branco
  await expect(page.getByTestId("quiz-review").getByText("Em branco")).toHaveCount(2);

  // --- revisão espaçada: flashcards novos vencem hoje ---------------------------------
  await page.getByRole("link", { name: "← Voltar para a matéria" }).click();
  await expect(page).toHaveURL(/\/subjects\/[^/]+$/);
  await page.getByRole("link", { name: /^Flashcards/ }).click();
  await expect(page).toHaveURL(/\/flashcards$/);
  await page.getByLabel("Quantidade").fill("2");
  await page.getByRole("button", { name: "Criar flashcards" }).click();
  await expect(page.getByTestId("flashcard-list").getByRole("button")).toHaveCount(2);

  await page.goto("/review");
  const card = page.locator('[data-testid="review-item"][data-kind="flashcard"]');
  for (let i = 0; i < 2; i++) {
    await expect(card).toBeVisible();
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await expect(page.getByTestId("flashcard-back")).toBeVisible();
    await page.getByRole("button", { name: "Bom" }).click();
  }
  // depois dos 2 cartões vêm as questões erradas do simulado (se houver) ou o fim
  await expect(page.getByTestId("review-done").or(page.locator('[data-testid="review-item"][data-kind="question"]'))).toBeVisible();
});

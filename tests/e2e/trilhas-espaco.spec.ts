import { expect, test, type Page } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";

async function signup(page: Page, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(`e2e3-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@teste.gabarita.local`);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Responde a questão aberta do tutor (no mock, as erradas começam com "Alternativa incorreta"). */
async function answerTutor(page: Page, wrong: boolean) {
  const card = page.getByTestId("question-card").last();
  const options = card.getByRole("radiogroup", { name: "Alternativas" }).getByRole("radio");
  await (wrong ? options.filter({ hasText: "Alternativa incorreta" }).first() : options.filter({ hasNotText: "Alternativa incorreta" }).first()).click();
  await card.getByRole("radio", { name: "Acho que sei" }).click();
  await card.getByRole("button", { name: "Responder" }).click();
}

test("trilha: tutor explica, diagnostica o erro e só libera a próxima etapa com 2 acertos", async ({ page }) => {
  test.setTimeout(180_000);
  await signup(page, "Aluno Trilha");
  await page.getByLabel("Matéria / prova").fill("Biologia");
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await page.getByTestId("subject-list").getByText("Biologia").click();
  await expect(page).toHaveURL(/\/subjects\//);
  await page.getByLabel("PDF, DOCX ou fotos").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(10)) });
  await page.getByRole("button", { name: "Enviar material" }).click();
  await expect(page.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });

  await page.getByRole("link", { name: "Trilhas" }).click();
  await page.getByLabel("Seu objetivo").fill("Entender biologia celular para a prova");
  await page.getByRole("button", { name: "Criar trilha" }).click();
  await expect(page).toHaveURL(/\/trilhas\/[^/]+$/, { timeout: 60_000 });
  const steps = page.getByTestId("path-step");
  await expect(steps.first()).toHaveAttribute("data-status", "available");
  await expect(steps.nth(1)).toHaveAttribute("data-status", "locked");

  await steps.first().getByRole("link").first().click();
  await expect(page.getByTestId("tutor-explanation").first()).toBeVisible({ timeout: 30_000 });

  // erra: o tutor diagnostica e explica de outro jeito
  await answerTutor(page, true);
  await expect(page.getByTestId("tutor-diagnosis")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("tutor-explanation")).toHaveCount(2);
  await expect(page.getByText("explicando de outro jeito")).toBeVisible();

  // acerta duas seguidas
  await answerTutor(page, false);
  await expect(page.getByTestId("step-streak")).toContainText("●○");
  await answerTutor(page, false);
  await expect(page.getByTestId("tutor-done")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("link", { name: "Ir para a trilha →" }).click();
  await expect(steps.first()).toHaveAttribute("data-status", "done");
  await expect(steps.nth(1)).toHaveAttribute("data-status", "available");
  await page.goto("/trilhas");
  await expect(page.getByTestId("path-progress").first()).toContainText("1 de");
});

test("espaço de estudos: Pomodoro registra o foco e conta para os cenários", async ({ page }) => {
  await page.clock.install();
  await signup(page, "Aluna Foco");
  await page.getByRole("link", { name: "Espaço de estudos" }).click();
  await expect(page.getByTestId("study-scene")).toBeVisible();
  await expect(page.getByTestId("space-total")).toHaveText("0 min");
  await expect(page.getByTestId("next-unlock")).toContainText("Faltam 100 min");

  await page.getByLabel("Nova meta").fill("Ler o capítulo 3");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.getByTestId("session-goals")).toContainText("Ler o capítulo 3");

  await page.getByLabel("Tipo de Pomodoro").selectOption("curto");
  await expect(page.getByTestId("pomodoro-clock")).toHaveText("15:00");
  await page.getByRole("button", { name: "Começar" }).click();
  await page.clock.fastForward("05:00");
  await expect(page.getByTestId("pomodoro-clock")).toHaveText(/^(09|10):\d\d$/);

  await page.clock.fastForward("10:05");
  await expect(page.getByTestId("space-toast")).toContainText("+15 min de foco");
  await expect(page.getByTestId("pomodoro-phase")).toHaveText("Pausa");
  await expect(page.getByTestId("space-total")).toHaveText("15 min");
  await expect(page.getByTestId("space-streak")).toContainText("1 dia");
  await expect(page.getByTestId("next-unlock")).toContainText("Faltam 85 min");

  // cenários trancados não podem ser escolhidos ainda
  await expect(page.getByTestId("scene-picker").getByRole("button", { name: /Biblioteca em Kyoto/ })).toBeDisabled();
});

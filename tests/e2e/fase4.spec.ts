import { expect, test } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { signup } from "./helpers";

// Fase 4 (IA de teste): sala da turma com convite, simulado da turma e ranking semanal.
test("sala da turma", async ({ browser }) => {
  test.setTimeout(180_000);
  const ana = await (await browser.newContext()).newPage();
  await signup(ana, "Ana Turma", "e2e5a");

  // matéria com material (para o simulado da turma)
  await ana.goto("/dashboard");
  await ana.getByLabel("Matéria / prova").fill("Biologia");
  await ana.getByRole("button", { name: "Criar matéria" }).click();
  await ana.getByTestId("subject-list").getByText("Biologia").click();
  await expect(ana).toHaveURL(/\/subjects\/[^/]+$/);
  await ana.getByLabel("Escolher arquivo").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(8)) });
  await ana.getByRole("button", { name: "Enviar material" }).click();
  await expect(ana.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });

  // Sala da turma
  await ana.getByRole("link", { name: "Turmas" }).click();
  await ana.getByLabel("Nome da sala").fill("Turma de Bio");
  await ana.getByRole("button", { name: "Criar sala" }).click();
  await expect(ana).toHaveURL(/\/rooms\/[a-z0-9]+$/);
  const invite = (await ana.getByTestId("invite-link").textContent())!;
  await ana.getByLabel("Questões").fill("4");
  await ana.getByRole("button", { name: "Criar simulado da turma" }).click();
  await expect(ana).toHaveURL(/\/simulado\//, { timeout: 60_000 });
  const roomQuizUrl = new URL(ana.url()).pathname;

  // Beto entra pelo link e faz o simulado da turma
  const beto = await (await browser.newContext()).newPage();
  await signup(beto, "Beto Turma", "e2e5b");
  await beto.goto(new URL(invite).pathname);
  await beto.getByRole("button", { name: "Entrar na sala" }).click();
  await expect(beto.getByRole("heading", { name: "Turma de Bio" })).toBeVisible();
  await expect(beto.getByTestId("room-members")).toContainText("Ana Turma");
  await beto.goto(roomQuizUrl);
  await beto.getByRole("button", { name: "Começar simulado" }).click();
  const q = beto.getByTestId("simulado-question");
  for (let i = 0; i < 4; i++) {
    await q.getByRole("radio").filter({ hasNotText: "Alternativa incorreta" }).first().click();
    if (i < 3) await q.getByRole("button", { name: "Próxima →" }).click();
  }
  await beto.getByRole("button", { name: "Entregar simulado" }).click();
  await expect(beto.getByTestId("room-quiz-score")).toHaveText("4 de 4 acertos");
  await beto.getByRole("link", { name: "← Voltar para a sala" }).click();
  const top = beto.getByTestId("room-ranking").locator("li").first();
  await expect(top).toContainText("Beto Turma");
  await expect(top.getByTestId("ranking-points")).toHaveText("4 pts");
});

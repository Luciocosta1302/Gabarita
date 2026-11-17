import { expect, type Page } from "@playwright/test";

export async function signup(page: Page, name: string, prefix = "e2e") {
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.gabarita.local`);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await skipTour(page);
}

/** Primeiro acesso: pula o tour de boas-vindas. */
export async function skipTour(page: Page) {
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/tutorials") && r.ok());
  await page.getByTestId("welcome-tour").getByRole("button", { name: "Pular" }).click();
  await saved;
  await expect(page.getByTestId("welcome-tour")).toBeHidden();
}


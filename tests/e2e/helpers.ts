import { expect, type Page } from "@playwright/test";

export async function signup(page: Page, name: string, prefix = "e2e") {
  await page.goto("/signup");
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("E-mail").fill(`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.gabarita.local`);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Vira Pro pelo fluxo de pagamento (simulado no ambiente de teste, sem Mercado Pago). */
export async function becomePro(page: Page) {
  await page.goto("/planos");
  await page.getByRole("button", { name: "Assinar com Pix ou cartão" }).click();
  await expect(page).toHaveURL(/\/planos\/simular/);
  await page.getByRole("button", { name: "Simular Pix aprovado" }).click();
  await expect(page.getByTestId("pro-active")).toBeVisible();
}

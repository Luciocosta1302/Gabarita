import { expect, test } from "@playwright/test";

import { signup } from "./helpers";

test("termos no cadastro, páginas públicas de privacidade e apagar a conta", async ({ page }) => {
  // páginas legais abrem sem login
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();
  await expect(page.getByText(/Google \(Gemini\)/)).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible();

  // sem aceitar os termos, o navegador não deixa criar a conta
  await page.goto("/signup");
  await expect(page.getByLabel(/Li e aceito/)).toHaveAttribute("required", "");

  await signup(page, "Quem Vai Embora", "e2e-conta");
  await page.goto("/perfil#apagar-conta");
  const del = page.getByTestId("delete-account");
  await expect(del).toBeDisabled();
  await page.getByLabel("Digite APAGAR para confirmar").fill("APAGAR");
  await del.click();
  await expect(page.getByTestId("account-deleted")).toBeVisible({ timeout: 20_000 });
  // sessão encerrada: a área logada manda para o login
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

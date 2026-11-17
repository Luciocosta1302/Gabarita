import { expect, test } from "@playwright/test";

import { signup } from "./helpers";

test("perfil: monta o avatar, escolhe o @ e aparece no menu e no perfil público", async ({ page }) => {
  await signup(page, "Lúcia Teste", "e2e-perfil");
  await page.getByTestId("me-chip").click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByTestId("guide-perfil")).toBeVisible();
  await expect(page.getByTestId("profile-level")).toContainText("1");

  const editor = page.getByTestId("avatar-editor");
  await editor.getByRole("radio", { name: "Daru" }).click();
  await editor.getByRole("tab", { name: "Cor" }).click();
  await editor.getByRole("radio", { name: "Matchá" }).click();
  await editor.getByRole("tab", { name: "Cabeça" }).click();
  // capelo é do nível 6: escolher mostra o cadeado e não deixa salvar
  await editor.getByRole("radio", { name: /Capelo de formatura \(libera no nível 6\)/ }).click();
  await expect(page.getByTestId("save-avatar")).toBeDisabled();
  await expect(editor).toContainText("Você está no nível 1");
  await editor.getByRole("radio", { name: "Hachimaki 必勝" }).click();
  await page.getByTestId("save-avatar").click();
  await expect(editor.getByRole("status")).toContainText("Avatar salvo");

  // @ e bio
  const at = `lucia_${Date.now() % 1000000}`;
  await page.getByLabel(/Seu @/).fill(at);
  await page.getByLabel("Bio (opcional)").fill("Concurso 2027");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByTestId("profile-form").getByRole("status")).toHaveText("Perfil salvo.");
  await expect(page.getByTestId("me-chip")).toContainText(`@${at}`);
  await expect(page.getByTestId("me-chip").locator('[data-item="hachimaki"]')).toHaveCount(1);

  // perfil público
  await page.getByTestId("profile-card").getByRole("link", { name: `@${at}` }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${at}$`));
  const pub = page.getByTestId("public-profile");
  await expect(pub.getByRole("heading", { name: "Lúcia Teste" })).toBeVisible();
  await expect(pub).toContainText("Concurso 2027");
  await expect(pub.locator('[data-item="hachimaki"]')).toHaveCount(1);
});

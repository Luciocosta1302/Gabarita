import { expect, test } from "@playwright/test";

// Fluxo da Fase 0: criar conta → criar matéria → sair → entrar → a matéria continua lá.
test("cadastro, criar matéria, sair e entrar de novo", async ({ page }) => {
  const email = `e2e-${Date.now()}@teste.gabarita.local`;
  const password = "senha-forte-123";

  // rota protegida manda para o login
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

  await page.goto("/signup");
  await page.getByLabel("Nome").fill("Aluna Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Nenhuma matéria ainda.")).toBeVisible();

  await page.getByLabel("Matéria / prova").fill("Cálculo I — P1");
  await page.getByLabel("Data da prova").fill("2026-12-10");
  await page.getByLabel("Horas por dia").fill("2");
  await page.getByLabel("Estilo da prova").selectOption("fgv");
  await page.getByRole("button", { name: "Criar matéria" }).click();

  const list = page.getByTestId("subject-list");
  await expect(list.getByText("Cálculo I — P1")).toBeVisible();
  await expect(list.getByText("FGV · prova em 10/12/2026")).toBeVisible();

  await list.getByText("Cálculo I — P1").click();
  await expect(page.getByRole("heading", { name: "Cálculo I — P1" })).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("subject-list").getByText("Cálculo I — P1")).toBeVisible();
});

import { expect, test } from "@playwright/test";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { becomePro, signup } from "./helpers";

// Fase 4 (IA de teste, pagamento e WhatsApp simulados): planos/limites, Pix → Pro, WhatsApp diário
// e sala da turma com convite, simulado da turma e ranking semanal.
test("planos, WhatsApp e sala da turma", async ({ browser }) => {
  test.setTimeout(180_000);
  const ana = await (await browser.newContext()).newPage();
  await signup(ana, "Ana Turma", "e2e5a");

  // grátis: uso aparece com limites
  await ana.goto("/planos");
  await expect(ana.getByTestId("usage")).toContainText("0/30");
  await expect(ana.getByTestId("usage")).toContainText("0/2");

  // Feynman bloqueado no grátis
  await ana.goto("/dashboard");
  await ana.getByLabel("Matéria / prova").fill("Biologia");
  await ana.getByRole("button", { name: "Criar matéria" }).click();
  await ana.getByTestId("subject-list").getByText("Biologia").click();
  await expect(ana).toHaveURL(/\/subjects\/[^/]+$/);
  const subjectUrl = ana.url();
  await ana.getByLabel("PDF, DOCX ou fotos").setInputFiles({ name: "bio.pdf", mimeType: "application/pdf", buffer: makePdf(studyPages(8)) });
  await ana.getByRole("button", { name: "Enviar material" }).click();
  await expect(ana.getByTestId("topic-tile").first()).toBeVisible({ timeout: 60_000 });
  await ana.getByRole("link", { name: /Modo Feynman/ }).click();
  await expect(ana.getByTestId("pro-gate")).toBeVisible();

  // Pix (simulado) → Pro
  await becomePro(ana);
  await expect(ana.getByText("Seu Pro está ativo até")).toBeVisible();

  // algumas questões para o WhatsApp mandar
  await ana.goto(subjectUrl);
  await ana.getByLabel("Quantidade").fill("5");
  await ana.getByRole("button", { name: "Gerar questões" }).click();
  await expect(ana).toHaveURL(/\/quiz\//, { timeout: 60_000 });

  // WhatsApp: número + ativar → questões de hoje → responder COMEÇAR pelo webhook
  await ana.getByRole("link", { name: "Perfil" }).click();
  const phone = `5511${String(Date.now()).slice(-9)}`;
  await ana.getByLabel("Número do WhatsApp").fill(phone.slice(2));
  await ana.getByLabel("Receber 5 questões por dia").check();
  await ana.getByRole("button", { name: "Salvar", exact: true }).last().click();
  await expect(ana.getByText("Configuração do WhatsApp salva.")).toBeVisible();
  await ana.getByRole("button", { name: "Mandar as questões de hoje agora" }).click();
  await expect(ana.getByTestId("wa-messages")).toContainText("Responda COMEÇAR");
  const res = await ana.request.post("/api/whatsapp/webhook", {
    data: { entry: [{ changes: [{ value: { messages: [{ from: phone, id: "wamid.1", type: "text", text: { body: "Começar" } }] } }] }] },
  });
  expect(res.ok()).toBe(true);
  await ana.reload();
  await expect(ana.getByTestId("wa-messages")).toContainText("Questão 1/5");

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

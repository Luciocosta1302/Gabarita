import { expect, test } from "@playwright/test";
import JSZip from "jszip";

/** Um PPTX mínimo com 2 slides de texto (e notas no 2º). */
async function makePptx() {
  const zip = new JSZip();
  const slide = (t: string) =>
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  zip.file("ppt/slides/slide1.xml", slide("Limites: o valor de que f(x) se aproxima quando x tende a a. ".repeat(6)));
  zip.file("ppt/slides/slide2.xml", slide("Derivada é o limite da razão incremental &amp; mede a taxa de variação. ".repeat(6)));
  zip.file("ppt/notesSlides/notesSlide2.xml", slide("Lembrar da regra da cadeia."));
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

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
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("convo-empty")).toBeVisible();

  // tour de boas-vindas (só na primeira vez): 6 passos com a turma (inclui o objetivo de estudo), termina em "Adicionar material"
  const tour = page.getByTestId("welcome-tour");
  await expect(tour.getByRole("heading", { name: "Bem-vindo ao Gabarita!" })).toBeVisible();
  await tour.getByRole("button", { name: "Próximo" }).click();
  // pergunta o objetivo de estudo (usado nas notícias e dicas)
  await expect(tour.getByRole("heading", { name: "Você estuda para quê?" })).toBeVisible();
  await tour.getByRole("radio", { name: "Vestibular / ENEM" }).click();
  for (let i = 0; i < 4; i++) await tour.getByRole("button", { name: "Próximo" }).click();
  await expect(tour.getByRole("heading", { name: "4. Volte todo dia" })).toBeVisible();
  await tour.getByRole("link", { name: "Começar" }).click();
  await expect(page).toHaveURL(/\/adicionar$/);
  await expect(tour).toBeHidden();

  // sem pasta nenhuma: manda o arquivo direto (pasta é opcional) e cai na conversa dele
  await expect(page.getByTestId("guide-adicionar")).toBeVisible();
  await expect(page.getByLabel("Pasta (opcional)")).toHaveValue("");
  await page.getByLabel("Escolher arquivo").setInputFiles({
    name: "aula-limites.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: await makePptx(),
  });
  await expect(page.getByTestId("picked-files")).toContainText("aula-limites.pptx");
  await page.getByRole("button", { name: "Enviar material" }).click();
  await expect(page).toHaveURL(/\/chat\/[^/?]+\?material=/);
  await expect(page.getByTestId("chat-folder")).toHaveText("Sem pasta");
  await expect(page.getByTestId("chat-welcome")).toContainText("aula-limites", { timeout: 60_000 });
  await expect(page.getByTestId("chat-suggestions").getByRole("button")).toHaveCount(4);
  // ação principal do arquivo: gerar questões (o chat vem em seguida)
  await expect(page.getByTestId("quick-quiz")).toContainText("Gerar 10 questões");

  // colocar numa pasta nova: a conversa vai junto
  await page.getByTestId("move-folder").click();
  await page.getByLabel("Nome da nova pasta").fill("Cálculo I — P1");
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(page.getByTestId("chat-folder")).toHaveText("Cálculo I — P1");
  await expect(page.getByTestId("chat-welcome")).toBeVisible();

  // a pasta tem o arquivo (slides) pronto
  await page.getByTestId("chat-folder").click();
  await expect(page.getByTestId("material-list")).toContainText("aula-limites");
  await expect(page.getByTestId("material-list")).toContainText("Slides");
  await expect(page.getByTestId("material-status")).toHaveText("Pronto");

  // guia da matéria: "Entendi" fecha para sempre; depois fica o botão "Como usar"
  await page.getByTestId("guide-materia").getByRole("button", { name: "Entendi" }).click();
  await expect(page.getByTestId("guide-materia")).toBeHidden();
  await page.waitForTimeout(500); // gravação do "visto" no servidor
  await page.reload();
  await expect(page.getByTestId("guide-materia")).toBeHidden();
  await page.getByRole("button", { name: "Como usar" }).click();
  await expect(page.getByTestId("guide-materia")).toBeVisible();

  await page.getByRole("link", { name: "Início", exact: true }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("welcome-tour")).toBeHidden(); // o tour não volta
  await expect(page.getByTestId("convo-list")).toContainText("aula-limites");

  // nova pasta: só o nome; a prova é opcional (recolhida)
  await page.getByLabel("Nome da pasta").fill("Física — P2");
  await page.getByText("Tem prova marcada?").click();
  await page.getByLabel("Data da prova").fill("2026-12-10");
  await page.getByLabel("Horas por dia").fill("2");
  await page.getByLabel("Estilo da prova").selectOption("fgv");
  await page.getByRole("button", { name: "Criar pasta" }).click();
  await expect(page.getByTestId("subject-list").getByText("Física — P2")).toBeVisible();

  const list = page.getByTestId("subject-list");
  await expect(list.getByText("Cálculo I — P1")).toBeVisible();
  await expect(list.getByText("FGV", { exact: true })).toBeVisible(); // da pasta Física
  await expect(list.getByText("dias p/ prova")).toBeVisible(); // contagem até a prova

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

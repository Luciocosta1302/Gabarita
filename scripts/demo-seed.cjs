/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Monta a conta de demonstração (ou uma conta local para prints): duas pastas, o PDF de História, a
 * videoaula de trigonometria, um quiz respondido, flashcards e uma conversa.
 *
 * Uso (precisa do Playwright, já instalado no projeto):
 *   BASE=https://seu-site EMAIL=demo@... PASSWORD=... PDF=caminho/do/arquivo.pdf node scripts/demo-seed.cjs
 *   (opcional) VIDEO=https://www.youtube.com/watch?v=...   SIGNUP=1 para criar a conta (local, sem confirmação)
 */
const { chromium } = require("playwright");

const { BASE, EMAIL, PASSWORD, PDF, SIGNUP } = process.env;
const VIDEO = process.env.VIDEO || "https://www.youtube.com/watch?v=C7NrVLmEYcs";
if (!BASE || !EMAIL || !PASSWORD || !PDF) {
  console.error("Defina BASE, EMAIL, PASSWORD e PDF.");
  process.exit(1);
}
const log = (m) => console.log(`[demo] ${m}`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30_000);

  if (SIGNUP) {
    await page.goto("/signup");
    await page.getByLabel("Nome").fill("Ana Demo");
    await page.getByLabel("E-mail").fill(EMAIL);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole("button", { name: "Criar conta" }).click();
  } else {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(EMAIL);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await page.waitForURL(/\/dashboard/);
  const tour = page.getByTestId("welcome-tour");
  if (await tour.isVisible().catch(() => false)) await tour.getByRole("button", { name: "Pular" }).click();
  log("logado");

  const call = (path, body) =>
    page.evaluate(
      async ([p, b]) => {
        const r = await fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
        return { status: r.status, json: await r.json().catch(() => null) };
      },
      [path, body],
    );
  // guias de primeira vez fechados (a pessoa que testa ainda vê o tour pelo Perfil, se quiser)
  for (const key of ["adicionar", "chat", "quiz", "materia", "plano", "erros", "revisao", "resolver", "flashcards"]) {
    await call("/api/tutorials", { key, seen: true });
  }

  const folder = async (name, extra) => {
    const r = await call("/api/folders", { name });
    if (r.status !== 201) throw new Error(`pasta: ${JSON.stringify(r)}`);
    const id = r.json.subject_id;
    const u = await call("/api/subjects", { action: "update", subject_id: id, name, ...extra });
    if (u.status !== 200) throw new Error(`editar pasta: ${JSON.stringify(u)}`);
    return id;
  };
  const exam = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const hist = await folder("História — 8º ano", { exam_date: exam, hours_per_day: 2, exam_style: "enem", color: "shu" });
  const mat = await folder("Matemática — Trigonometria", { exam_date: null, exam_style: "livre", color: "ai" });
  log("pastas criadas");

  const waitReady = async (what) => {
    await page.waitForURL(/\/chat\//, { timeout: 60_000 });
    await page.getByTestId("chat-welcome").waitFor({ timeout: 480_000 });
    log(`${what} pronto`);
    return new URL(page.url()).searchParams.get("material");
  };
  await page.goto(`/adicionar?materia=${hist}`);
  await page.getByLabel("Escolher arquivo").setInputFiles(PDF);
  await page.getByRole("button", { name: "Enviar material" }).click();
  const pdfId = await waitReady("PDF");

  // quiz de 10 questões do PDF, respondido (umas certas, outras erradas: enche o caderno de erros)
  const gen = page.waitForResponse((r) => r.url().includes("/api/generate/questions"), { timeout: 400_000 });
  await page.getByTestId("quick-quiz").click();
  const genRes = await gen;
  if (!genRes.ok()) throw new Error(`questões: ${await genRes.text()}`);
  await page.waitForURL(/\/quiz\//);
  const confidences = ["Tenho certeza", "Acho que sei", "Chutei"];
  for (let i = 0; ; i++) {
    const card = page.getByTestId("question-card").last();
    await card.waitFor();
    await card.getByRole("radiogroup", { name: "Alternativas" }).getByRole("radio").nth(i % 3 === 2 ? 3 : 0).click();
    await card.getByRole("radio").filter({ hasText: new RegExp(confidences[i % 3].split(" ")[0], "i") }).first().click();
    await card.getByRole("button", { name: "Responder" }).click();
    await card.getByTestId("answer-feedback").waitFor();
    const next = page.getByRole("button", { name: /Próxima|Ver resultado/ }).last();
    const label = await next.innerText();
    await next.click();
    if (/Ver resultado/.test(label)) break;
  }
  const party = page.getByTestId("celebration");
  if (await party.isVisible().catch(() => false)) await party.getByRole("button", { name: "Ver resultado" }).click();
  log("quiz respondido");

  await call("/api/generate/flashcards", { subject_id: hist, material_id: pdfId, count: 8 });
  await call("/api/generate/summary", { material_id: pdfId });
  await call("/api/chat", { subject_id: hist, material_id: pdfId, message: "O que foi o Dia do Fico?" });
  log("flashcards, resumo e conversa");

  await page.goto(`/adicionar?materia=${mat}&modo=link`);
  await page.getByLabel("Link da página, do PDF ou do vídeo").fill(VIDEO);
  await page.getByRole("button", { name: "Enviar material" }).click();
  await waitReady("vídeo");

  await browser.close();
  log("pronto");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

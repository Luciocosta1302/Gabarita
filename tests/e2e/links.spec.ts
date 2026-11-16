import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import { signup } from "./helpers";

// Link como material (IA de teste): página da web e vídeo do YouTube.
test("página da web e vídeo do YouTube viram material", async ({ page }) => {
  test.setTimeout(120_000);
  const paragraphs = Array.from({ length: 10 }, (_, i) => `<p>Parte ${i + 1}: a fotossíntese acontece nos cloroplastos e transforma luz em energia química.</p>`).join("");
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(`<title>Fotossíntese explicada</title><article>${paragraphs}</article>`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/fotossintese`;

  try {
    await signup(page, "Ana Links", "e2e7");
    await page.getByLabel("Matéria / prova").fill("Biologia");
    await page.getByRole("button", { name: "Criar matéria" }).click();
    await page.getByTestId("subject-list").getByText("Biologia").click();
    await expect(page).toHaveURL(/\/subjects\/[^/]+$/);

    await page.getByRole("tab", { name: "Link ou YouTube" }).click();
    await page.getByLabel("Link da página, do PDF ou do vídeo").fill(url);
    await page.getByRole("button", { name: "Enviar material" }).click();
    await expect(page.getByText("Fotossíntese explicada").first()).toBeVisible({ timeout: 60_000 });

    await page.getByRole("tab", { name: "Link ou YouTube" }).click();
    await page.getByLabel("Link da página, do PDF ou do vídeo").fill("https://youtu.be/jNQXAC9IVRw");
    await page.getByRole("button", { name: "Enviar material" }).click();
    await expect(page.getByText("Vídeo do YouTube").first()).toBeVisible({ timeout: 60_000 });

    // o material do vídeo mostra a transcrição com os tempos e o link para o original
    await page.getByRole("link", { name: "https://www.youtube.com/watch?v=jNQXAC9IVRw" }).click();
    await expect(page.getByTestId("source-link")).toHaveAttribute("href", "https://www.youtube.com/watch?v=jNQXAC9IVRw");
    await expect(page.getByText(/A mitose gera duas/)).toBeVisible();
    // os tempos viram links para aquele ponto do vídeo
    await expect(page.getByTestId("video-time").filter({ hasText: "[01:30]" }).first()).toHaveAttribute("href", "https://www.youtube.com/watch?v=jNQXAC9IVRw&t=90s");
  } finally {
    server.close();
  }
});

import { expect, test } from "@playwright/test";

// Proteções da API e cabeçalhos (não precisam de login: barram antes).
test("cabeçalhos de segurança, CSRF e JSON obrigatório", async ({ request }) => {
  const page = await request.get("/login");
  const h = page.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();

  // pedido vindo de outro site é recusado antes de tudo
  const csrf = await request.post("/api/notes", { headers: { Origin: "https://site-malicioso.example", "Content-Type": "application/json" }, data: { action: "create" } });
  expect(csrf.status()).toBe(403);
  // formulário comum (text/plain) não passa
  const form = await request.post("/api/notes", { headers: { "Content-Type": "text/plain" }, data: '{"action":"create"}' });
  expect(form.status()).toBe(415);
  // sem login
  const anon = await request.post("/api/notes", { data: { action: "create" } });
  expect(anon.status()).toBe(401);
  // fila de jobs sem login nem segredo
  expect((await request.post("/api/jobs/process", { headers: { Authorization: "Bearer chute" } })).status()).toBe(401);
});

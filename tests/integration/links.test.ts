import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { fetchLink } from "@/lib/ingest/links";
import { ingestMaterial } from "@/lib/ingest/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";

import { makePdf, studyPages } from "../fixtures/make-pdf";
import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
const admin = createAdminClient();
let ana: U;
let subjectId: string;
let server: Server;
let base: string;

const ARTIGO = `<html><head><title>Mitose — guia</title></head><body><nav>Menu</nav><article>
${Array.from({ length: 8 }, (_, i) => `<p>Parágrafo ${i + 1}: a mitose divide a célula em duas células-filhas idênticas, passando por prófase, metáfase, anáfase e telófase.</p>`).join("")}
</article></body></html>`;

beforeAll(async () => {
  ana = await newUser("ana-links");
  const { data } = await ana.client.from("subjects").insert({ user_id: ana.user.id, name: "Bio" }).select("id").single();
  subjectId = data!.id;
  server = createServer((req, res) => {
    if (req.url === "/artigo") return res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(ARTIGO);
    if (req.url === "/apostila.pdf") return res.writeHead(200, { "content-type": "application/pdf" }).end(Buffer.from(makePdf(studyPages(3))));
    if (req.url === "/vazio") return res.writeHead(200, { "content-type": "text/html" }).end("<div id=app></div><script>app()</script>");
    if (req.url === "/redireciona") return res.writeHead(302, { location: "/artigo" }).end();
    if (req.url === "/login") return res.writeHead(403).end();
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());

async function linkMaterial(type: "web" | "youtube", url: string) {
  const id = crypto.randomUUID();
  const { error } = await ana.client.from("materials").insert({ id, user_id: ana.user.id, subject_id: subjectId, type, title: url, source_url: url, storage_path: `${ana.user.id}/${id}` });
  expect(error).toBeNull();
  return id;
}

describe("links como material", () => {
  it("sem permissão especial, endereço interno é recusado (SSRF)", async () => {
    delete process.env.LINK_FETCH_ALLOW_LOCAL;
    await expect(fetchLink(`${base}/artigo`)).rejects.toThrow(/porta não permitida|endereço interno/);
    await expect(fetchLink("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/endereço interno/);
    await expect(fetchLink("http://localhost/")).rejects.toThrow(/endereço interno/);
  });

  it("página da web vira trechos e ganha o título da página", async () => {
    process.env.LINK_FETCH_ALLOW_LOCAL = "true";
    const id = await linkMaterial("web", `${base}/redireciona`);
    const r = await ingestMaterial(admin, id);
    expect(r.chunks).toBeGreaterThan(0);
    const { data: m } = await ana.client.from("materials").select("title, status, type").eq("id", id).single();
    expect(m).toEqual({ title: "Mitose — guia", status: "ready", type: "web" });
    const { data: chunks } = await ana.client.from("chunks").select("content").eq("material_id", id);
    expect(chunks!.map((c) => c.content).join(" ")).toContain("células-filhas idênticas");
    expect(chunks!.map((c) => c.content).join(" ")).not.toContain("Menu");
  });

  it("link de PDF vira material PDF (com o arquivo guardado)", async () => {
    const id = await linkMaterial("web", `${base}/apostila.pdf`);
    const r = await ingestMaterial(admin, id);
    expect(r.pages).toBe(3);
    const { data: m } = await ana.client.from("materials").select("type").eq("id", id).single();
    expect(m!.type).toBe("pdf");
    const { data: files } = await ana.client.storage.from("materials").list(`${ana.user.id}/${id}`);
    expect(files!.map((f) => f.name)).toEqual(["001.pdf"]);
  });

  it("página sem texto ou que exige login dá mensagem clara", async () => {
    await expect(ingestMaterial(admin, await linkMaterial("web", `${base}/vazio`))).rejects.toThrow(/Quase não há texto/);
    await expect(ingestMaterial(admin, await linkMaterial("web", `${base}/login`))).rejects.toThrow(/exige login/);
  });

  it("vídeo do YouTube é transcrito pela IA (de teste) com os tempos", async () => {
    const id = await linkMaterial("youtube", "https://www.youtube.com/watch?v=jNQXAC9IVRw");
    const r = await ingestMaterial(admin, id);
    expect(r.chunks).toBeGreaterThan(0);
    const { data: chunks } = await ana.client.from("chunks").select("content").eq("material_id", id);
    expect(chunks![0].content).toContain("[01:30]");
  });
});

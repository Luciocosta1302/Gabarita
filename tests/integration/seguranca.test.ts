import { beforeAll, describe, expect, it } from "vitest";

import { anon, newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let beto: U;

beforeAll(async () => {
  ana = await newUser("ana-seg");
  beto = await newUser("beto-seg");
});

describe("segurança", () => {
  it("limite de requisições conta por aluno e por janela", async () => {
    const bucket = `teste:${crypto.randomUUID().slice(0, 8)}`;
    const hit = (u: U) => u.client.rpc("hit_rate_limit", { p_bucket: bucket, p_limit: 2, p_window_seconds: 60 });
    expect((await hit(ana)).data).toBe(true);
    expect((await hit(ana)).data).toBe(true);
    expect((await hit(ana)).data).toBe(false);
    expect((await hit(beto)).data).toBe(true); // outro aluno tem a própria conta
    // ninguém lê nem zera o contador pelo cliente
    expect((await ana.client.from("rate_limits").select("*")).data).toEqual([]);
    expect((await anon().rpc("hit_rate_limit", { p_bucket: bucket, p_limit: 2, p_window_seconds: 60 })).error).not.toBeNull();
  });

  it("Storage só aceita os tipos de arquivo do app, na pasta do próprio aluno", async () => {
    const html = new Blob(["<script>alert(1)</script>"], { type: "text/html" });
    expect((await ana.client.storage.from("materials").upload(`${ana.user.id}/x/001.html`, html, { contentType: "text/html" })).error).not.toBeNull();
    const pdf = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    expect((await ana.client.storage.from("materials").upload(`${ana.user.id}/x/001.pdf`, pdf, { contentType: "application/pdf" })).error).toBeNull();
    expect((await beto.client.storage.from("materials").upload(`${ana.user.id}/y/001.pdf`, pdf, { contentType: "application/pdf" })).error).not.toBeNull();
    expect((await beto.client.storage.from("materials").download(`${ana.user.id}/x/001.pdf`)).error).not.toBeNull();
  });

  it("quem não está logado não chama funções internas nem lê tabelas", async () => {
    const a = anon();
    expect((await a.rpc("owns_subject", { p_subject_id: crypto.randomUUID() })).error).not.toBeNull();
    expect((await a.from("subjects").select("id")).data ?? []).toEqual([]);
    expect((await a.from("community_posts").select("id")).data ?? []).toEqual([]);
  });

  it("perfil novo continua sendo criado no cadastro (gatilho sem permissão pública)", async () => {
    const { data } = await ana.client.from("profiles").select("name").single();
    expect(data?.name).toBe("ana-seg");
  });
});

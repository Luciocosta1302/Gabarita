import { beforeAll, describe, expect, it } from "vitest";

import { createAdminClient } from "@/lib/supabase/admin";

import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let bia: U;
const admin = createAdminClient();

beforeAll(async () => {
  ana = await newUser("ana-news");
  bia = await newUser("bia-news");
});

describe("notícias (banco)", () => {
  it("preferências: cada aluno só vê e edita as suas", async () => {
    const { error } = await ana.client.from("news_prefs").insert({ user_id: ana.user.id, sources: ["g1-educacao"], state: "SP" });
    expect(error).toBeNull();
    const { data } = await bia.client.from("news_prefs").select("user_id");
    expect(data).toEqual([]);
    const bad = await ana.client.from("news_prefs").update({ state: "São Paulo" }).eq("user_id", ana.user.id);
    expect(bad.error).not.toBeNull();
  });

  it("notícias: todo aluno lê; só o servidor grava", async () => {
    const url = `https://exemplo.com/n/${Date.now()}`;
    await admin.from("news_items").insert({ feed_key: "teste", source_name: "Teste", url, title: "Notícia", published_at: new Date().toISOString(), tags: ["enem"] });
    const { data } = await bia.client.from("news_items").select("title, tags").eq("url", url);
    expect(data).toEqual([{ title: "Notícia", tags: ["enem"] }]);
    const ins = await bia.client.from("news_items").insert({ feed_key: "x", source_name: "x", url: `${url}/2`, title: "falsa", published_at: new Date().toISOString() });
    expect(ins.error).not.toBeNull();
    await bia.client.from("news_items").update({ title: "alterada" }).eq("url", url);
    const { data: still } = await admin.from("news_items").select("title").eq("url", url).single();
    expect(still!.title).toBe("Notícia");
  });

  it("objetivo de estudo: só valores conhecidos", async () => {
    expect((await ana.client.from("profiles").update({ study_goal: "concurso" }).eq("id", ana.user.id)).error).toBeNull();
    expect((await ana.client.from("profiles").update({ study_goal: "hackear" }).eq("id", ana.user.id)).error).not.toBeNull();
  });
});

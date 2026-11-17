import { beforeAll, describe, expect, it } from "vitest";

import { anon, newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let bia: U;

beforeAll(async () => {
  ana = await newUser("ana-tutoriais");
  bia = await newUser("bia-tutoriais");
});

describe("tutoriais vistos", () => {
  it("começa vazio, marca sem repetir, desmarca e zera", async () => {
    const { data: p } = await ana.client.from("profiles").select("tutorials_seen").eq("id", ana.user.id).single();
    expect(p!.tutorials_seen).toEqual([]);

    await ana.client.rpc("set_tutorial_seen", { p_key: "boas-vindas" });
    const { data: twice } = await ana.client.rpc("set_tutorial_seen", { p_key: "boas-vindas" });
    expect(twice).toEqual(["boas-vindas"]);
    const { data: two } = await ana.client.rpc("set_tutorial_seen", { p_key: "espaco" });
    expect([...two!].sort()).toEqual(["boas-vindas", "espaco"]);

    const { data: removed } = await ana.client.rpc("set_tutorial_seen", { p_key: "espaco", p_seen: false });
    expect(removed).toEqual(["boas-vindas"]);
    const { data: reset } = await ana.client.rpc("set_tutorial_seen", { p_key: "*", p_seen: false });
    expect(reset).toEqual([]);
  });

  it("só mexe no próprio perfil e recusa chave estranha", async () => {
    await bia.client.rpc("set_tutorial_seen", { p_key: "review" });
    const { data } = await ana.client.from("profiles").select("tutorials_seen").eq("id", ana.user.id).single();
    expect(data!.tutorials_seen).not.toContain("review");

    const { error } = await ana.client.rpc("set_tutorial_seen", { p_key: "<script>" });
    expect(error?.message).toMatch(/chave inválida/);
  });

  it("não dá para editar a coluna direto nem chamar sem login", async () => {
    await ana.client.from("profiles").update({ tutorials_seen: Array(500).fill("x") }).eq("id", ana.user.id);
    const { data } = await ana.client.from("profiles").select("tutorials_seen").eq("id", ana.user.id).single();
    expect(data!.tutorials_seen.length).toBeLessThan(500);

    const { error } = await anon().rpc("set_tutorial_seen", { p_key: "espaco" });
    expect(error).not.toBeNull();
  });
});

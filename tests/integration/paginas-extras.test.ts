import { beforeAll, describe, expect, it } from "vitest";

import { reflectWeek } from "@/lib/journal/service";

import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let beto: U;

beforeAll(async () => {
  ana = await newUser("ana6");
  beto = await newUser("beto6");
});

describe("diário de aprendizagem", () => {
  it("registros são privados e o acompanhamento precisa de 2 registros", async () => {
    await ana.client.from("journal_entries").insert({ user_id: ana.user.id, learned: "Mitose tem 4 fases", mood: "bem" });
    await expect(reflectWeek(ana.client, ana.user.id)).rejects.toThrow(/pelo menos 2/);
    await ana.client.from("journal_entries").insert({ user_id: ana.user.id, learned: "Meiose gera 4 células", difficulties: "crossing-over", mood: "cansado" });
    const r = await reflectWeek(ana.client, ana.user.id);
    expect(r.summary).toMatch(/2 registros/);
    const { data: saved } = await ana.client.from("journal_reflections").select("id");
    expect(saved).toHaveLength(1);
    const { data: other } = await beto.client.from("journal_entries").select("id");
    expect(other).toHaveLength(0);
    const { error } = await beto.client.from("journal_entries").insert({ user_id: ana.user.id, learned: "intruso", mood: "ok" });
    expect(error).not.toBeNull();
  });
});

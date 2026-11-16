import { beforeAll, describe, expect, it } from "vitest";

import { enqueueJob, runJobs } from "@/lib/jobs/queue";
import { reflectWeek } from "@/lib/journal/service";
import { searchMaterialChunks } from "@/lib/rag/search";

import { makePdf, studyPages } from "../fixtures/make-pdf";

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

describe("biblioteca: chat por documento", () => {
  it("a busca fica dentro do material escolhido e respeita o dono", async () => {
    const { data: s } = await ana.client.from("subjects").insert({ user_id: ana.user.id, name: "Bio" }).select("id").single();
    const ids: string[] = [];
    for (const n of [3, 4]) {
      const id = crypto.randomUUID();
      await ana.client.storage.from("materials").upload(`${ana.user.id}/${id}/001.pdf`, makePdf(studyPages(n)), { contentType: "application/pdf" });
      await ana.client.from("materials").insert({ id, user_id: ana.user.id, subject_id: s!.id, type: "pdf", title: `M${n}`, storage_path: `${ana.user.id}/${id}` });
      await enqueueJob(ana.client, ana.user.id, "ingest_material", { material_id: id });
      ids.push(id);
    }
    await runJobs({ userId: ana.user.id });
    const found = await searchMaterialChunks(ana.client, ids[1], "célula", 50);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((c) => c.material_id === ids[1])).toBe(true);
    expect(await searchMaterialChunks(beto.client, ids[1], "célula", 50)).toHaveLength(0);
  });
});

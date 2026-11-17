import { beforeAll, describe, expect, it } from "vitest";

import { createFolder, ensureInbox, INBOX_NAME } from "@/lib/folders/folders";

import { newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let bia: U;

beforeAll(async () => {
  ana = await newUser("ana-pastas");
  bia = await newUser("bia-pastas");
});

describe("pastas", () => {
  it("a “Sem pasta” é uma só por aluno, mesmo pedida ao mesmo tempo", async () => {
    const ids = await Promise.all([ensureInbox(ana.client, ana.user.id), ensureInbox(ana.client, ana.user.id), ensureInbox(ana.client, ana.user.id)]);
    expect(new Set(ids).size).toBe(1);
    const { data } = await ana.client.from("subjects").select("name, inbox").eq("inbox", true);
    expect(data).toEqual([{ name: INBOX_NAME, inbox: true }]);
    // cada aluno tem a sua
    expect(await ensureInbox(bia.client, bia.user.id)).not.toBe(ids[0]);
  });

  it("pasta nova nasce só com o nome", async () => {
    const id = await createFolder(ana.client, ana.user.id, "Cálculo I");
    const { data } = await ana.client.from("subjects").select("name, exam_date, inbox").eq("id", id).single();
    expect(data).toEqual({ name: "Cálculo I", exam_date: null, inbox: false });
  });
});

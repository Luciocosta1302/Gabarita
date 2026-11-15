import { beforeAll, describe, expect, it } from "vitest";

import { fakeEmbedding } from "@/lib/ai/providers/mock";

import { anon, newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let beto: U;
let anaSubjectId: string;

beforeAll(async () => {
  ana = await newUser("ana");
  beto = await newUser("beto");
  const { data, error } = await ana.client
    .from("subjects")
    .insert({ user_id: ana.user.id, name: "Biologia", exam_style: "enem" })
    .select("id")
    .single();
  if (error) throw error;
  anaSubjectId = data.id;
});

describe("profiles", () => {
  it("é criado no cadastro com o nome", async () => {
    const { data } = await ana.client.from("profiles").select("name, plan").single();
    expect(data).toEqual({ name: "ana", plan: "free" });
  });

  it("o usuário não consegue se dar plano Pro", async () => {
    const { error } = await ana.client.from("profiles").update({ plan: "pro" }).eq("id", ana.user.id);
    expect(error).not.toBeNull();
    const { data } = await ana.client.from("profiles").select("plan").single();
    expect(data?.plan).toBe("free");
  });
});

describe("subjects", () => {
  it("o dono vê a própria matéria", async () => {
    const { data } = await ana.client.from("subjects").select("id, name");
    expect(data).toEqual([{ id: anaSubjectId, name: "Biologia" }]);
  });

  it("outro usuário não vê, não altera e não apaga", async () => {
    const { data } = await beto.client.from("subjects").select("id");
    expect(data).toEqual([]);

    await beto.client.from("subjects").update({ name: "hackeado" }).eq("id", anaSubjectId);
    await beto.client.from("subjects").delete().eq("id", anaSubjectId);
    const { data: still } = await ana.client.from("subjects").select("name").eq("id", anaSubjectId).single();
    expect(still?.name).toBe("Biologia");
  });

  it("ninguém cria matéria em nome de outro", async () => {
    const { error } = await beto.client.from("subjects").insert({ user_id: ana.user.id, name: "falsa" });
    expect(error).not.toBeNull();
  });

  it("visitante sem login não vê nada", async () => {
    const { data } = await anon().from("subjects").select("id");
    expect(data).toEqual([]);
  });
});

describe("tabelas filhas", () => {
  it("não dá para pendurar material na matéria de outra pessoa", async () => {
    const { error } = await beto.client
      .from("materials")
      .insert({ user_id: beto.user.id, subject_id: anaSubjectId, type: "text", title: "intruso" });
    expect(error).not.toBeNull();
  });

  it("match_chunks só devolve trechos do próprio usuário", async () => {
    const { data: mat, error: e1 } = await ana.client
      .from("materials")
      .insert({ user_id: ana.user.id, subject_id: anaSubjectId, type: "text", title: "Fotossíntese" })
      .select("id")
      .single();
    if (e1) throw e1;

    const texts = ["A fotossíntese ocorre nos cloroplastos da folha.", "A mitocôndria faz a respiração celular."];
    const { error: e2 } = await ana.client.from("chunks").insert(
      texts.map((content, i) => ({
        user_id: ana.user.id,
        material_id: mat.id,
        subject_id: anaSubjectId,
        content,
        page: i + 1,
        embedding: JSON.stringify(fakeEmbedding(content)),
      })),
    );
    if (e2) throw e2;

    const query = JSON.stringify(fakeEmbedding("onde ocorre a fotossíntese?"));
    const { data: hits, error: e3 } = await ana.client.rpc("match_chunks", {
      query_embedding: query,
      p_subject_id: anaSubjectId,
      k: 2,
    });
    if (e3) throw e3;
    expect(hits?.[0].page).toBe(1);

    const { data: none } = await beto.client.rpc("match_chunks", {
      query_embedding: query,
      p_subject_id: anaSubjectId,
      k: 5,
    });
    expect(none).toEqual([]);
  });
});

describe("storage", () => {
  it("cada usuário só envia arquivos na própria pasta", async () => {
    const file = new Blob(["oi"], { type: "text/plain" });
    const ok = await ana.client.storage.from("materials").upload(`${ana.user.id}/a.txt`, file);
    expect(ok.error).toBeNull();
    const bad = await beto.client.storage.from("materials").upload(`${ana.user.id}/b.txt`, file);
    expect(bad.error).not.toBeNull();
    const read = await beto.client.storage.from("materials").download(`${ana.user.id}/a.txt`);
    expect(read.error).not.toBeNull();
  });
});

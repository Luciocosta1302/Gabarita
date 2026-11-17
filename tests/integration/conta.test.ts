import { describe, expect, it } from "vitest";

import { deleteAccount } from "@/lib/account/delete";
import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";

import { newUser } from "./helpers";

const admin = createAdminClient();

describe("apagar conta (LGPD)", () => {
  it("apaga usuário, dados em cascata e arquivos do Storage", async () => {
    const { client, user } = await newUser("apagar");
    const { data: subject } = await client.from("subjects").insert({ name: "História" }).select("id").single();
    const { data: material } = await client
      .from("materials")
      .insert({ subject_id: subject!.id, type: "text", title: "Aula", status: "ready", storage_path: `${user.id}/m1` })
      .select("id")
      .single();
    const up = await client.storage.from(MATERIALS_BUCKET).upload(`${user.id}/m1/001.txt`, new Blob(["texto da aula"], { type: "text/plain" }));
    expect(up.error).toBeNull();
    await client.from("community_posts").insert({ category: "duvida", title: "Dúvida sobre a aula", body: "Alguém explica?", author_name: "x" });
    const { data: room } = await client.from("rooms").insert({ owner_id: user.id, name: "Turma", invite_code: `c${Date.now()}` }).select("id").single();

    const out = await deleteAccount(admin, user.id);
    expect(out.files).toBe(1);

    const { data: gone } = await admin.auth.admin.getUserById(user.id);
    expect(gone.user).toBeNull();
    for (const [table, id] of [["subjects", subject!.id], ["materials", material!.id], ["rooms", room?.id]] as const) {
      if (!id) continue;
      const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("id", id);
      expect(count, table).toBe(0);
    }
    const { count: posts } = await admin.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    expect(posts).toBe(0);
    const { data: files } = await admin.storage.from(MATERIALS_BUCKET).list(`${user.id}/m1`);
    expect(files ?? []).toHaveLength(0);
  });
});

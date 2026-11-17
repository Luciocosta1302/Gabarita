import { describe, expect, it, vi } from "vitest";

import { isModerator, loadQueue, moderate } from "@/lib/moderation/moderation";
import { createAdminClient } from "@/lib/supabase/admin";

import { newUser } from "./helpers";

const admin = createAdminClient();

describe("moderação da Comunidade", () => {
  it("só os e-mails de ADMIN_EMAILS moderam", () => {
    vi.stubEnv("ADMIN_EMAILS", " Mod@Exemplo.com , outra@x.com");
    expect(isModerator("mod@exemplo.com")).toBe(true);
    expect(isModerator("aluno@exemplo.com")).toBe(false);
    expect(isModerator(null)).toBe(false);
    vi.unstubAllEnvs();
  });

  it("post com 3 denúncias aparece na fila; restaurar volta a mostrar e zera; apagar remove", async () => {
    const autor = await newUser("autor");
    const { data: post } = await autor.client
      .from("community_posts")
      .insert({ category: "dica", title: "Post denunciado", body: "conteúdo", author_name: "x" })
      .select("id")
      .single();
    for (const label of ["d1", "d2", "d3"]) {
      const u = await newUser(label);
      const { error } = await u.client.from("community_reports").insert({ post_id: post!.id, reason: "spam" });
      expect(error).toBeNull();
    }
    let queue = await loadQueue(admin);
    const item = queue.find((q) => q.id === post!.id)!;
    expect(item).toMatchObject({ kind: "post", hidden: true, reports: 3, reasons: { spam: 3 } });

    await moderate(admin, { kind: "post", id: post!.id, action: "restore" });
    const { data: back } = await admin.from("community_posts").select("hidden").eq("id", post!.id).single();
    expect(back!.hidden).toBe(false);
    queue = await loadQueue(admin);
    expect(queue.find((q) => q.id === post!.id)).toBeUndefined();

    await moderate(admin, { kind: "post", id: post!.id, action: "delete" });
    const { count } = await admin.from("community_posts").select("id", { count: "exact", head: true }).eq("id", post!.id);
    expect(count).toBe(0);
  });
});

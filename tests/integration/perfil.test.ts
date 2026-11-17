import { beforeAll, describe, expect, it } from "vitest";

import { createAdminClient } from "@/lib/supabase/admin";

import { anon, newUser } from "./helpers";

type U = Awaited<ReturnType<typeof newUser>>;
let ana: U;
let bia: U;
const admin = createAdminClient();

beforeAll(async () => {
  ana = await newUser("ana-perfil");
  bia = await newUser("bia-perfil");
});

describe("perfil público", () => {
  it("o aluno edita @, bio e avatar; o @ é único", async () => {
    const at = `ana_${Date.now() % 100000}`;
    const { error } = await ana.client
      .from("profiles")
      .update({ username: at, bio: "Medicina", avatar_json: { who: "fuku", color: "neve", head: "fones", neck: "nada", bg: "ai" } })
      .eq("id", ana.user.id);
    expect(error).toBeNull();
    const dup = await bia.client.from("profiles").update({ username: at }).eq("id", bia.user.id);
    expect(dup.error?.code).toBe("23505");
    const bad = await bia.client.from("profiles").update({ username: "Com Espaço" }).eq("id", bia.user.id);
    expect(bad.error).not.toBeNull();

    const { data } = await bia.client.rpc("public_profile_by_username", { p_username: at.toUpperCase() });
    expect(data?.[0]).toMatchObject({ username: at, bio: "Medicina", posts: 0 });
    expect(JSON.stringify(data)).not.toContain("@"); // sem e-mail
  });

  it("XP só o servidor grava; colegas veem nome, @, avatar e XP", async () => {
    await ana.client.from("profiles").update({ xp_cached: 999999 } as never).eq("id", ana.user.id);
    const { data: p } = await admin.from("profiles").select("xp_cached").eq("id", ana.user.id).single();
    expect(p!.xp_cached).toBe(0);
    await admin.from("profiles").update({ xp_cached: 350 }).eq("id", ana.user.id);
    const { data } = await bia.client.rpc("public_profiles", { p_ids: [ana.user.id] });
    expect(data?.[0]).toMatchObject({ xp: 350 });
    expect(Object.keys(data![0]).sort()).toEqual(["avatar_json", "bio", "id", "name", "username", "xp"]);
  });

  it("avatar grande demais e quem não está logado são recusados", async () => {
    const big = await ana.client.from("profiles").update({ avatar_json: { x: "y".repeat(3000) } }).eq("id", ana.user.id);
    expect(big.error).not.toBeNull();
    const { error } = await anon().rpc("public_profiles", { p_ids: [ana.user.id] });
    expect(error).not.toBeNull();
  });
});

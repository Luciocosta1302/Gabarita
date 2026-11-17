import { describe, expect, it } from "vitest";

import { avatarSchema, COLORS, DEFAULT_AVATAR, lockedParts, parseAvatar, suggestUsername, usernameSchema } from "@/lib/avatar/avatar";

describe("avatar", () => {
  it("valida personagem, cor do personagem certo e roupas", () => {
    expect(avatarSchema.safeParse({ who: "daru", color: "dourado", head: "capelo", neck: "medalha", bg: "kin" }).success).toBe(true);
    // cor de outro personagem não vale
    expect(avatarSchema.safeParse({ who: "daru", color: "tricolor", head: "nada", neck: "nada", bg: "washi" }).success).toBe(false);
    expect(avatarSchema.safeParse({ who: "dragao", color: "x", head: "nada", neck: "nada", bg: "washi" }).success).toBe(false);
  });
  it("lê qualquer coisa do banco sem quebrar", () => {
    expect(parseAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(parseAvatar({ who: "fuku" })).toEqual(DEFAULT_AVATAR);
    expect(parseAvatar({ who: "fuku", color: "neve", head: "fones", neck: "nada", bg: "ai" }).color).toBe("neve");
  });
  it("roupas acima do nível ficam bloqueadas", () => {
    const a = { who: "daru" as const, color: "dourado", head: "capelo", neck: "nada", bg: "washi" };
    expect(lockedParts(a, 1)).toEqual(["cor Dourado (nível 5)", "Capelo de formatura (nível 6)"]);
    expect(lockedParts(a, 6)).toEqual([]);
    expect(lockedParts(DEFAULT_AVATAR, 1)).toEqual([]);
    // todo personagem tem pelo menos 3 cores no nível 1
    for (const list of Object.values(COLORS)) expect(list.filter((c) => c.level === 1).length).toBeGreaterThanOrEqual(3);
  });
  it("@usuário", () => {
    expect(usernameSchema.parse("  Lucia_2027 ")).toBe("lucia_2027");
    expect(usernameSchema.safeParse("lú").success).toBe(false);
    expect(usernameSchema.safeParse("com espaço").success).toBe(false);
    expect(suggestUsername("Lúcia Costa")).toBe("lucia_costa");
    expect(suggestUsername("Jo")).toBe("aluno_jo");
  });
});

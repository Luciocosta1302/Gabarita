import { NextResponse } from "next/server";

import { levelOf, xpOf } from "@/lib/achievements/badges";
import { loadAchievementCounts } from "@/lib/achievements/load";
import { apiRoute, jsonError } from "@/lib/api/route";
import { lockedParts } from "@/lib/avatar/avatar";
import { profileSchema } from "@/lib/validation/generate";

/** Atualiza nome, @usuário, bio e avatar. Roupas acima do nível do aluno são recusadas. */
export const POST = apiRoute(profileSchema, async (input, { supabase, user }) => {
  if (input.avatar) {
    const { level } = levelOf(xpOf(await loadAchievementCounts(supabase)));
    const locked = lockedParts(input.avatar, level);
    if (locked.length) {
      return jsonError(`Ainda bloqueado no seu nível (${level}): ${locked.join(", ")}. Estude mais um pouco para liberar!`, 403);
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.username !== undefined && { username: input.username }),
      ...(input.bio !== undefined && { bio: input.bio || null }),
      ...(input.avatar !== undefined && { avatar_json: input.avatar }),
    })
    .eq("id", user.id);
  if (error?.code === "23505") return jsonError(`O @${input.username} já é de outra pessoa. Tente outro (ex.: com um número no fim).`, 409);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { levelOf, xpOf } from "@/lib/achievements/badges";
import { cacheXp, loadAchievementCounts } from "@/lib/achievements/load";
import { type Avatar, parseAvatar } from "@/lib/avatar/avatar";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type ProfileCard = {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  avatar: Avatar;
  hasAvatar: boolean;
  xp: number;
  level: ReturnType<typeof levelOf>;
  createdAt: string;
};

/**
 * Perfil do próprio aluno com XP e nível calculados das atividades. Se o XP mudou, guarda em
 * `profiles.xp_cached` (pelo servidor) para os colegas verem o nível na Comunidade e na turma.
 */
export async function loadMyProfile(supabase: DB, userId: string): Promise<ProfileCard> {
  const [{ data: p }, counts] = await Promise.all([
    supabase.from("profiles").select("name, username, bio, avatar_json, xp_cached, created_at").eq("id", userId).single(),
    loadAchievementCounts(supabase),
  ]);
  const xp = xpOf(counts);
  if (p && p.xp_cached !== xp) await cacheXp(supabase, xp);
  return {
    id: userId,
    name: p?.name ?? "Aluno",
    username: p?.username ?? null,
    bio: p?.bio ?? null,
    avatar: parseAvatar(p?.avatar_json),
    hasAvatar: !!p?.avatar_json,
    xp,
    level: levelOf(xp),
    createdAt: p?.created_at ?? new Date().toISOString(),
  };
}

export type PublicProfile = { id: string; name: string; username: string | null; avatar: Avatar; level: number };

/** Nome, @, avatar e nível de vários alunos (função pública do banco, só campos públicos). */
export async function loadPublicProfiles(supabase: DB, ids: string[]): Promise<Map<string, PublicProfile>> {
  const unique = [...new Set(ids)].slice(0, 200);
  if (!unique.length) return new Map();
  const { data } = await supabase.rpc("public_profiles", { p_ids: unique });
  return new Map(
    (data ?? []).map((r) => [r.id, { id: r.id, name: r.name, username: r.username, avatar: parseAvatar(r.avatar_json), level: levelOf(r.xp).level }]),
  );
}

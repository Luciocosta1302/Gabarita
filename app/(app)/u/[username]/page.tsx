import Link from "next/link";
import { notFound } from "next/navigation";

import { AvatarBadge } from "@/components/avatar/avatar";
import { MascotSays } from "@/components/brand/mascot-says";
import { levelOf } from "@/lib/achievements/badges";
import { parseAvatar } from "@/lib/avatar/avatar";
import { getUser } from "@/lib/supabase/server";

/** Perfil de um aluno: só o próprio aluno e colegas de alguma turma em comum veem (avatar, @, nível, bio). */
export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!/^[a-z0-9_]{3,20}$/i.test(username)) notFound();
  const { supabase, user } = await getUser();
  const { data } = await supabase.rpc("public_profile_by_username", { p_username: username });
  const p = data?.[0];
  if (!p) {
    return (
      <div className="flex flex-col gap-6">
        <MascotSays pose={{ who: "fuku", mood: "surpresa" }}>Não encontrei o @{username.toLowerCase()}. Os perfis só aparecem para colegas de turma: se vocês ainda não estão numa turma juntos, entre na mesma turma pelo convite.</MascotSays>
      </div>
    );
  }
  const avatar = parseAvatar(p.avatar_json);
  const lv = levelOf(p.xp);
  const mine = p.id === user?.id;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card seigaiha-ink grid justify-items-center gap-3 rounded-3xl border-2 border-ink p-6 text-center shadow-[0_5px_0_var(--ink)]" data-testid="public-profile">
        <AvatarBadge avatar={avatar} size={128} className="animate-char-pop border-[3px]" label={`Avatar de ${p.name}`} />
        <div>
          <h1 className="text-3xl [overflow-wrap:anywhere]">{p.name}</h1>
          <p className="text-muted-foreground font-bold">@{p.username}</p>
        </div>
        {p.bio && <p className="max-w-md">{p.bio}</p>}
        <dl className="mt-1 flex flex-wrap justify-center gap-3">
          {[
            { k: "Nível", v: lv.level },
            { k: "XP", v: p.xp.toLocaleString("pt-BR") },
            { k: "Posts", v: Number(p.posts) },
          ].map((s) => (
            <div key={s.k} className="bg-background min-w-20 rounded-2xl border-2 border-ink px-4 py-2 shadow-[0_3px_0_var(--ink)]">
              <dt className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">{s.k}</dt>
              <dd className="font-display text-2xl font-extrabold">{s.v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">Estuda no Gabarita desde {new Date(p.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
        {mine && (
          <Link href="/perfil" className="text-shu text-sm font-bold underline-offset-4 hover:underline">
            Editar meu perfil
          </Link>
        )}
      </section>
    </div>
  );
}

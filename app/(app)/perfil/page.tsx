import Link from "next/link";

import { AvatarBadge } from "@/components/avatar/avatar";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ProfileForm } from "@/components/profile/profile-forms";
import { ToolGuide } from "@/components/tutorials/tutorials";
import { Counter } from "@/components/ui/counter";
import { suggestUsername } from "@/lib/avatar/avatar";
import { loadMyProfile } from "@/lib/profile/load";
import { SoundToggle } from "@/components/feedback/sound-toggle";
import { ResetTutorials } from "@/components/tutorials/tutorials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, todayBR } from "@/lib/dates";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Perfil — Gabarita" };

export default async function ProfilePage() {
  const { supabase, user } = await getUser();
  const [me, { data: usage }] = await Promise.all([
    loadMyProfile(supabase, user!.id),
    supabase.from("ai_usage").select("day, calls, input_tokens, output_tokens").gte("day", addDays(todayBR(), -30)).order("day", { ascending: false }),
  ]);
  const total = (usage ?? []).reduce((s, u) => ({ calls: s.calls + u.calls, tokens: s.tokens + Number(u.input_tokens) + Number(u.output_tokens) }), { calls: 0, tokens: 0 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Perfil</h1>
      <ToolGuide id="perfil" />

      {/* cartão do aluno: avatar, @, nível e XP */}
      <section className="bg-ai seigaiha text-washi animate-rise relative overflow-hidden rounded-3xl border-2 border-ink p-5 shadow-[0_5px_0_var(--ink)] sm:p-6" data-testid="profile-card">
        <div className="flex items-center gap-4 pr-16 sm:gap-6 sm:pr-20">
          <AvatarBadge avatar={me.avatar} size={96} className="border-[3px] border-washi shadow-[0_4px_0_rgb(0_0_0/0.35)]" label="Seu avatar" />
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="font-display text-2xl leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-3xl">{me.name}</p>
            <p className="text-washi/80 text-sm font-bold">
              {me.username ? (
                <Link href={`/u/${me.username}`} className="underline-offset-4 hover:underline">
                  @{me.username}
                </Link>
              ) : (
                "Escolha seu @ abaixo"
              )}
              <span className="text-washi/50 block text-xs font-medium">desde {new Date(me.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
            </p>
            {me.bio && <p className="text-washi/85 text-sm">{me.bio}</p>}
          </div>
          <div className="absolute top-4 right-4 grid justify-items-center gap-0.5 sm:top-6 sm:right-6" data-testid="profile-level">
            <span className="bg-shu grid size-14 place-items-center rounded-full border-[3px] border-washi shadow-[0_3px_0_rgb(0_0_0/0.35)] sm:size-16">
              <span className="font-display text-2xl leading-none font-extrabold">{me.level.level}</span>
            </span>
            <span className="text-[11px] font-bold tracking-[0.14em] uppercase">nível</span>
          </div>
        </div>
        <div className="mt-5 grid gap-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span>
              <Counter value={me.xp} /> XP
            </span>
            <span className="text-washi/70">
              faltam {(me.level.next - me.xp).toLocaleString("pt-BR")} XP para o nível {me.level.level + 1}
            </span>
          </div>
          <div className="h-3.5 overflow-hidden rounded-full border-2 border-washi/80 bg-black/25" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={Math.round(me.level.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="bg-kin h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(3, me.level.progress * 100)}%` }} />
          </div>
          <Link href="/conquistas" className="text-washi/80 justify-self-start text-xs underline underline-offset-2">
            Como ganhar XP e ver as medalhas
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Monte seu personagem</CardTitle>
          <p className="text-muted-foreground text-sm">Escolha quem te representa, a cor e as roupas. Itens com cadeado são liberados conforme você sobe de nível.</p>
        </CardHeader>
        <CardContent>
          <AvatarEditor initial={me.avatar} level={me.level.level} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <p className="text-muted-foreground text-sm">
            {user!.email} (o e-mail não aparece para ninguém). Seu perfil (avatar, @, bio e nível) só aparece para colegas das suas turmas.
          </p>
        </CardHeader>
        <CardContent>
          <ProfileForm name={me.name} username={me.username} bio={me.bio} suggested={suggestUsername(me.name)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sons e animações</CardTitle>
          <p className="text-muted-foreground text-sm">
            Sons curtos de acerto, erro, carimbo e fim do Pomodoro. A escolha fica guardada neste aparelho. Para menos animação, ative “reduzir
            movimento” nas configurações de acessibilidade do celular ou computador.
          </p>
        </CardHeader>
        <CardContent>
          <SoundToggle withLabel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutoriais</CardTitle>
          <p className="text-muted-foreground text-sm">Cada ferramenta tem um guia rápido. Quer ver todos de novo, inclusive o de boas-vindas?</p>
        </CardHeader>
        <CardContent>
          <ResetTutorials />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso de IA (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm" data-testid="ai-usage">
          {total.calls === 0 ? (
            <p className="text-muted-foreground">Nenhum uso ainda.</p>
          ) : (
            <p>
              {total.calls} {total.calls === 1 ? "chamada" : "chamadas"} · {total.tokens.toLocaleString("pt-BR")} tokens
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

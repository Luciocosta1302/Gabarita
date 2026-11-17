import Link from "next/link";
import { loadPublicProfiles } from "@/lib/profile/load";
import { AuthorChip } from "@/components/avatar/author-chip";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CopyInvite, CreateRoomQuizForm, ImportButton, JoinButton, ShareMaterialForm } from "@/components/rooms/room-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";


export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9]{4,40}$/i.test(code)) notFound();
  const { supabase, user } = await getUser();
  const { data: room } = await supabase.from("rooms").select("id, name, owner_id, invite_code").eq("invite_code", code.toLowerCase()).maybeSingle();

  // Não é membro (RLS esconde a sala): convite para entrar.
  if (!room) {
    return (
      <div className="mx-auto grid max-w-md gap-4 rounded-3xl bg-pastel-lilac p-6 text-center">
        <h1 className="text-2xl font-bold">Convite para uma sala da turma</h1>
        <p className="text-sm">Entre para juntar materiais, fazer simulados com a turma e aparecer no ranking da semana.</p>
        <JoinButton code={code} />
      </div>
    );
  }

  const [{ data: ranking }, { data: members }, { data: quizzes }, { data: myAttempts }, { data: shared }, { data: mySubjects }, { data: myMaterials }] = await Promise.all([
    supabase.rpc("room_weekly_ranking", { p_room_id: room.id }),
    supabase.rpc("room_member_names", { p_room_id: room.id }),
    supabase.from("room_quizzes").select("id, title, created_at, time_limit_s, created_by, room_attempts(user_id, correct, total)").eq("room_id", room.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("room_attempts").select("room_quiz_id, correct, total").eq("room_id", room.id).eq("user_id", user!.id),
    supabase.from("room_materials").select("id, title, shared_by, created_at").eq("room_id", room.id).order("created_at", { ascending: false }),
    supabase.from("subjects").select("id, name").order("created_at", { ascending: false }),
    supabase.from("materials").select("id, title").eq("status", "ready").neq("type", "past_exam").eq("user_id", user!.id),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.name]));
  const people = await loadPublicProfiles(supabase, (ranking ?? []).map((r) => r.user_id));
  const mine = new Map((myAttempts ?? []).map((a) => [a.room_quiz_id, a]));
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/salas" className="text-muted-foreground text-sm hover:underline">
        ← Turmas
      </Link>
      <div className="bg-card seigaiha-ink animate-rise grid gap-2 rounded-3xl border-2 border-ink p-6 shadow-[0_4px_0_var(--ink)]">
        <h1 className="text-3xl font-bold">{room.name}</h1>
        <p className="text-sm">{members?.length ?? 0} na turma · mande o link para quem estuda com você</p>
        <CopyInvite url={`${origin}/rooms/${room.invite_code}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ranking da semana</CardTitle>
            <p className="text-muted-foreground text-xs">Pontos = acertos nos simulados da turma + acertos nas suas próprias questões da semana.</p>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2" data-testid="room-ranking">
              {(ranking ?? []).map((r, i) => (
                <li key={r.user_id} className={cn("flex items-center justify-between rounded-xl border p-3 text-sm", r.user_id === user!.id && "border-primary bg-accent")}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("font-display inline-grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink text-sm font-extrabold", i === 0 ? "bg-shu text-washi" : i < 3 ? "bg-kin/70" : "bg-card")}>{i + 1}</span>
                    <AuthorChip profile={people.get(r.user_id)} fallbackName={r.name} size={30} />
                    {r.user_id === user!.id && <span className="text-muted-foreground shrink-0">(você)</span>}
                  </span>
                  <span className="font-semibold" data-testid="ranking-points">
                    {r.points} pts
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulados da turma</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CreateRoomQuizForm roomId={room.id} code={room.invite_code} subjects={mySubjects ?? []} />
            <ul className="grid gap-2" data-testid="room-quizzes">
              {(quizzes ?? []).map((q) => {
                const a = mine.get(q.id);
                const best = Math.max(0, ...q.room_attempts.map((x) => x.correct));
                return (
                  <li key={q.id}>
                    <Link href={`/rooms/${room.invite_code}/simulado/${q.id}`} className="hover:bg-accent flex justify-between gap-2 rounded-xl border p-3 text-sm">
                      <span>
                        {q.title}
                        <span className="text-muted-foreground block text-xs">
                          por {names.get(q.created_by) ?? "colega"} · {q.room_attempts.length} {q.room_attempts.length === 1 ? "fez" : "fizeram"} · melhor: {best}
                        </span>
                      </span>
                      <span className="shrink-0">{a ? `${a.correct}/${a.total}` : "Fazer →"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiais da turma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ShareMaterialForm roomId={room.id} materials={myMaterials ?? []} />
          {!shared?.length ? (
            <p className="text-muted-foreground text-sm">Ninguém compartilhou material ainda.</p>
          ) : (
            <ul className="grid gap-2" data-testid="room-materials">
              {shared.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <span>
                    {m.title}
                    <span className="text-muted-foreground block text-xs">de {names.get(m.shared_by) ?? "colega"}</span>
                  </span>
                  {m.shared_by !== user!.id && <ImportButton roomMaterialId={m.id} subjects={mySubjects ?? []} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quem está na sala</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2 text-sm" data-testid="room-members">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="bg-muted rounded-full px-3 py-1">
                {m.name}
                {m.user_id === room.owner_id && " · quem criou"}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

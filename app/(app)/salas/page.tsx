import Link from "next/link";

import { CreateRoomForm, JoinRoomForm } from "@/components/rooms/room-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Turmas — Gabarita" };

export default async function RoomsPage() {
  const supabase = await createClient();
  const [{ data: rooms }, { data: subjects }] = await Promise.all([
    supabase.from("rooms").select("id, name, invite_code, created_at, room_members(user_id)").order("created_at", { ascending: false }),
    supabase.from("subjects").select("id, name").order("created_at", { ascending: false }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Salas da turma</h1>
        <p className="text-muted-foreground text-sm">
          Crie uma sala, mande o link para a turma: vocês juntam materiais, fazem simulados juntos e têm um ranking semanal.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nova sala</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <CreateRoomForm subjects={subjects ?? []} />
          <JoinRoomForm />
        </CardContent>
      </Card>
      {!rooms?.length ? (
        <p className="text-muted-foreground text-sm">Você ainda não está em nenhuma sala.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="room-list">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link href={`/rooms/${r.invite_code}`} className="bg-pastel-lilac hover:-translate-y-0.5 block rounded-2xl p-5 shadow-sm transition-transform">
                <span className="font-semibold">{r.name}</span>
                <span className="text-foreground/70 block text-xs">{r.room_members.length} {r.room_members.length === 1 ? "pessoa" : "pessoas"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

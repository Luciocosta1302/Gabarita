import { NameForm } from "@/components/profile/profile-forms";
import { SoundToggle } from "@/components/feedback/sound-toggle";
import { ResetTutorials } from "@/components/tutorials/tutorials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, todayBR } from "@/lib/dates";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Perfil — Gabarita" };

export default async function ProfilePage() {
  const { supabase, user } = await getUser();
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("name").single(),
    supabase.from("ai_usage").select("day, calls, input_tokens, output_tokens").gte("day", addDays(todayBR(), -30)).order("day", { ascending: false }),
  ]);
  const total = (usage ?? []).reduce((s, u) => ({ calls: s.calls + u.calls, tokens: s.tokens + Number(u.input_tokens) + Number(u.output_tokens) }), { calls: 0, tokens: 0 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <p className="text-muted-foreground text-sm">{user!.email}</p>
        </CardHeader>
        <CardContent>
          <NameForm name={profile?.name ?? ""} />
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

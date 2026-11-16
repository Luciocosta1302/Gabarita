import Link from "next/link";

import { NameForm, WhatsAppForm } from "@/components/profile/profile-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPlan } from "@/lib/billing/limits";
import { addDays, todayBR } from "@/lib/dates";
import { getUser } from "@/lib/supabase/server";
import { whatsappConfigured } from "@/lib/whatsapp/client";

export const metadata = { title: "Perfil — Gabarita" };

export default async function ProfilePage() {
  const { supabase, user } = await getUser();
  const [{ data: profile }, plan, { data: usage }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("name, whatsapp_phone, whatsapp_opt_in, whatsapp_hour").single(),
    loadPlan(supabase, user!.id),
    supabase.from("ai_usage").select("day, calls, input_tokens, output_tokens").gte("day", addDays(todayBR(), -30)).order("day", { ascending: false }),
    supabase.from("whatsapp_messages").select("id, direction, body, created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  const total = (usage ?? []).reduce((s, u) => ({ calls: s.calls + u.calls, tokens: s.tokens + Number(u.input_tokens) + Number(u.output_tokens) }), { calls: 0, tokens: 0 });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <p className="text-muted-foreground text-sm">
            {user!.email} · plano <strong>{plan.pro ? "Pro" : "Grátis"}</strong>
            {plan.pro && plan.proUntil ? ` até ${new Date(plan.proUntil).toLocaleDateString("pt-BR")}` : ""} ·{" "}
            <Link href="/planos" className="text-primary underline">
              Planos
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <NameForm name={profile?.name ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5 questões por dia no WhatsApp</CardTitle>
          <p className="text-muted-foreground text-sm">
            Todo dia, no horário escolhido, chegam 5 questões do que você precisa revisar. Responda com a letra lá mesmo; os erros vão para o caderno.
            {!plan.pro && " Recurso do plano Pro."}
            {!whatsappConfigured() && " (Ambiente de teste: as mensagens aparecem abaixo em vez de ir para o WhatsApp.)"}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <WhatsAppForm phone={profile?.whatsapp_phone ?? ""} optIn={!!profile?.whatsapp_opt_in} hour={profile?.whatsapp_hour ?? 8} pro={plan.pro} />
          {messages && messages.length > 0 && (
            <div className="grid gap-2" data-testid="wa-messages">
              <span className="text-sm font-semibold">Conversa recente</span>
              {[...messages].reverse().map((m) => (
                <p
                  key={m.id}
                  className={
                    m.direction === "out"
                      ? "bg-pastel-mint max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
                      : "bg-primary text-primary-foreground max-w-[85%] justify-self-end rounded-2xl px-3 py-2 text-sm"
                  }
                >
                  {m.body}
                </p>
              ))}
            </div>
          )}
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

import { JournalForm, MOOD_LABELS, ReflectButton } from "@/components/journal/journal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalReflection } from "@/lib/ai/prompts/journal";
import { addDays, shortDateBR, todayBR } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ToolGuide } from "@/components/tutorials/tutorials";

export const metadata = { title: "Diário de aprendizagem — Gabarita" };

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ foco?: string }> }) {
  const sp = await searchParams;
  const focus = Number(sp.foco);
  const supabase = await createClient();
  const weekStart = addDays(todayBR(), -6);
  const [{ data: subjects }, { data: entries }, { data: reflection }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("journal_entries").select("id, created_at, mood, learned, difficulties, focus_minutes, subjects(name)").order("created_at", { ascending: false }).limit(60),
    supabase.from("journal_reflections").select("period_start, period_end, content_json, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const weekCount = (entries ?? []).filter((e) => todayBR(new Date(e.created_at)) >= weekStart).length;
  const r = reflection?.content_json as JournalReflection | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Diário de aprendizagem</h1>
        <p className="text-muted-foreground text-sm">Registre ao fim de cada sessão. Uma vez por semana, a IA lê seus registros e mostra sua evolução.</p>
      </div>
      <ToolGuide id="diario" />

      <Card>
        <CardHeader>
          <CardTitle>Novo registro{Number.isFinite(focus) && focus > 0 ? ` · ${focus} min de foco` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalForm subjects={subjects ?? []} focusMinutes={Number.isFinite(focus) && focus > 0 ? Math.min(1440, Math.round(focus)) : undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento da semana</CardTitle>
          <p className="text-muted-foreground text-sm">{weekCount} registro(s) nos últimos 7 dias.</p>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          {r && reflection ? (
            <div className="grid gap-3" data-testid="journal-reflection">
              <p className="text-muted-foreground text-xs">
                {shortDateBR(reflection.period_start)} a {shortDateBR(reflection.period_end)}
              </p>
              <p className="text-base">{r.summary}</p>
              {r.progress.length > 0 && <Section title="Avanços" items={r.progress} />}
              {r.recurring_difficulties.length > 0 && <Section title="Dificuldades que se repetem" items={r.recurring_difficulties} />}
              <p>
                <strong>Humor:</strong> {r.mood_trend}
              </p>
              <Section title="Próximos passos" items={r.suggestions} />
              <p className="italic">{r.encouragement}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Faça pelo menos 2 registros na semana para gerar o primeiro acompanhamento.</p>
          )}
          <ReflectButton disabled={weekCount < 2} />
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Registros</h2>
        {(entries ?? []).length === 0 && <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>}
        <ul className="grid gap-3" data-testid="journal-entries">
          {(entries ?? []).map((e) => (
            <li key={e.id} className="bg-card grid gap-1 rounded-2xl border p-4 text-sm shadow-sm">
              <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                <span>{shortDateBR(todayBR(new Date(e.created_at)))}</span>
                <span>{MOOD_LABELS[e.mood as keyof typeof MOOD_LABELS] ?? e.mood}</span>
                {e.subjects?.name && <span>· {e.subjects.name}</span>}
                {e.focus_minutes ? <span>· {e.focus_minutes} min de foco</span> : null}
              </div>
              <p>{e.learned}</p>
              {e.difficulties && <p className="text-muted-foreground">Dificuldade: {e.difficulties}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <strong>{title}</strong>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

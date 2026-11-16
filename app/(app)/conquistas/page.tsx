import { Card, CardContent } from "@/components/ui/card";
import { type AchievementCounts, evaluate, levelOf, xpOf } from "@/lib/achievements/badges";
import { focusStats } from "@/lib/focus/stats";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conquistas — Gabarita" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };
  const [answered, correct, focus, materials, errorsResolved, simulados, stepsDone, feynman, journal, rooms, flashcardReviews] = await Promise.all([
    count(supabase.from("attempts").select("id", head)),
    count(supabase.from("attempts").select("id", head).eq("correct", true)),
    focusStats(supabase),
    count(supabase.from("materials").select("id", head).neq("type", "past_exam")),
    count(supabase.from("error_notebook").select("id", head).not("resolved_at", "is", null)),
    count(supabase.from("quizzes").select("id", head).eq("mode", "simulado").not("finished_at", "is", null)),
    count(supabase.from("path_steps").select("id", head).eq("status", "done")),
    count(supabase.from("feynman_sessions").select("id", head)),
    count(supabase.from("journal_entries").select("id", head)),
    count(supabase.from("room_members").select("room_id", head)),
    count(supabase.from("reviews").select("id", head).not("last_reviewed_at", "is", null)),
  ]);
  const c: AchievementCounts = {
    answered,
    correct,
    streak: focus.streak,
    focusMinutes: focus.totalMinutes,
    materials,
    errorsResolved,
    simulados,
    stepsDone,
    feynman,
    journal,
    rooms,
    flashcardReviews,
  };
  const lvl = levelOf(xpOf(c));
  const badges = evaluate(c);
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <p className="text-muted-foreground text-sm">XP vem de tudo o que você faz: questões, foco, simulados, trilhas, diário.</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6" data-testid="level">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">Nível {lvl.level}</span>
            <span className="text-muted-foreground text-sm">{lvl.xp} XP</span>
          </div>
          <div className="bg-muted h-3 overflow-hidden rounded-full" role="progressbar" aria-valuenow={Math.round(lvl.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso até o próximo nível">
            <div className="bg-primary h-full rounded-full" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">
            Faltam {lvl.next - lvl.xp} XP para o nível {lvl.level + 1} · {unlocked} de {badges.length} conquistas · sequência de {c.streak} dia(s) 🔥
          </p>
        </CardContent>
      </Card>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="badges">
        {badges.map((b) => (
          <li
            key={b.id}
            data-unlocked={b.unlocked}
            className={cn("bg-card grid gap-2 rounded-2xl border p-4 shadow-sm", !b.unlocked && "opacity-60")}
          >
            <div className="flex items-center gap-3">
              <span className={cn("text-3xl", !b.unlocked && "grayscale")} aria-hidden>
                {b.icon}
              </span>
              <div>
                <p className="font-semibold">
                  {b.name} {b.unlocked && <span className="text-xs">✓</span>}
                </p>
                <p className="text-muted-foreground text-xs">{b.description}</p>
              </div>
            </div>
            {!b.unlocked && (
              <div className="grid gap-1">
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div className="bg-primary h-full" style={{ width: `${b.progress * 100}%` }} />
                </div>
                <span className="text-muted-foreground text-xs">
                  {Math.min(b.value, b.goal)}/{b.goal}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

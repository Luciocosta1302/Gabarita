import { Card, CardContent } from "@/components/ui/card";
import { evaluate, levelOf, xpOf } from "@/lib/achievements/badges";
import { loadAchievementCounts, markSeen } from "@/lib/achievements/load";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conquistas — Gabarita" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const c = await loadAchievementCounts(supabase);
  const lvl = levelOf(xpOf(c));
  const badges = evaluate(c);
  await markSeen(supabase, badges.filter((b) => b.unlocked).map((b) => b.id));
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

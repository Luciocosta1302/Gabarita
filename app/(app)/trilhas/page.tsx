import Link from "next/link";

import { CreatePathForm } from "@/components/paths/create-path-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pathProgress, type StepStatus } from "@/lib/paths/logic";
import { createClient } from "@/lib/supabase/server";

// capas em cores tradicionais (índigo, vermelho-selo, matchá)
const CARD_SKIES = ["bg-ai", "bg-shu", "bg-matcha"];

export default async function PathsPage() {
  const supabase = await createClient();
  const [{ data: paths }, { data: subjects }, { data: topics }] = await Promise.all([
    supabase
      .from("learning_paths")
      .select("id, title, goal, created_at, subjects(name), path_steps(status)")
      .order("created_at", { ascending: false }),
    supabase.from("subjects").select("id, name").order("created_at", { ascending: false }),
    supabase.from("topics").select("subject_id"),
  ]);
  const topicCount = new Map<string, number>();
  for (const t of topics ?? []) topicCount.set(t.subject_id, (topicCount.get(t.subject_id) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Trilhas de aprendizagem</h1>
        <p className="text-muted-foreground text-sm">
          Diga seu objetivo e o Gabarita monta um caminho em etapas a partir do seu material. Em cada etapa, o Tutor IA
          explica, testa com uma questão e só libera a próxima quando você acerta duas seguidas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova trilha</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePathForm subjects={(subjects ?? []).map((s) => ({ ...s, topics: topicCount.get(s.id) ?? 0 }))} />
        </CardContent>
      </Card>

      {!paths?.length ? (
        <p className="text-muted-foreground text-sm">Nenhuma trilha ainda.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="path-list">
          {paths.map((p, i) => {
            const prog = pathProgress(p.path_steps.map((s) => ({ status: s.status as StepStatus })));
            return (
              <li key={p.id}>
                <Link
                  href={`/trilhas/${p.id}`}
                  className={`seigaiha animate-rise block overflow-hidden rounded-2xl border-2 border-ink ${CARD_SKIES[i % CARD_SKIES.length]} text-washi shadow-[0_4px_0_var(--ink)] transition-transform hover:-translate-y-0.5`}
                >
                  <div className="relative h-24">
                    {/* silhueta de montanha e torii, desenho próprio */}
                    <svg viewBox="0 0 200 60" className="absolute bottom-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
                      <path d="M0 60 L60 18 L85 32 L120 8 L200 60 Z" fill="rgba(40,20,40,.35)" />
                      <path d="M0 60 L40 40 L90 52 L140 34 L200 50 L200 60 Z" fill="rgba(40,20,40,.55)" />
                      <g fill="rgba(60,15,30,.8)">
                        <rect x="150" y="30" width="2.5" height="20" />
                        <rect x="165" y="30" width="2.5" height="20" />
                        <rect x="145" y="28" width="28" height="3" rx="1" />
                        <rect x="148" y="34" width="22" height="2" />
                      </g>
                    </svg>
                  </div>
                  <div className="bg-black/25 grid gap-1 p-4">
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-xs opacity-85">{p.subjects?.name}</span>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/30">
                      <div className="h-full bg-white" style={{ width: `${prog.percent}%` }} />
                    </div>
                    <span className="text-xs opacity-85" data-testid="path-progress">
                      {prog.done} de {prog.total} etapas
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

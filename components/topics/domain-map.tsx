import { masteryLabel } from "@/lib/topics/mastery";
import type { TopicStat } from "@/lib/topics/stats";
import { cn } from "@/lib/utils";

import { PracticeButton } from "./practice-button";

function tone(m: number | null) {
  if (m == null) return "bg-muted";
  if (m < 0.4) return "bg-pastel-rose";
  if (m < 0.7) return "bg-pastel-peach";
  return "bg-pastel-mint";
}

/** D8 — mapa de domínio por tópico (0–100%) + falsa certeza por tópico (D7). */
export function DomainMap({ subjectId, topics }: { subjectId: string; topics: TopicStat[] }) {
  const sorted = [...topics].sort((a, b) => (a.mastery ?? 0.5) - (b.mastery ?? 0.5));
  return (
    <div className="grid gap-3">
      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="bg-pastel-rose size-3 rounded" /> fraco</span>
        <span className="flex items-center gap-1"><span className="bg-pastel-peach size-3 rounded" /> em progresso</span>
        <span className="flex items-center gap-1"><span className="bg-pastel-mint size-3 rounded" /> dominado</span>
        <span className="flex items-center gap-1"><span className="bg-muted size-3 rounded" /> sem dados</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="domain-map">
        {sorted.map((t) => {
          const pct = t.mastery == null ? null : Math.round(t.mastery * 100);
          const sure = t.confidence.find((c) => c.level === "certeza");
          return (
            <li key={t.id} data-testid="topic-tile" className={cn("grid gap-2 rounded-2xl p-4 shadow-sm", tone(t.mastery))}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  {t.summary && <p className="text-foreground/70 text-xs">{t.summary}</p>}
                </div>
                <span className="font-display text-2xl font-bold" data-testid="topic-mastery">
                  {pct == null ? "—" : `${pct}%`}
                </span>
              </div>
              <div className="bg-background/60 h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full" style={{ width: `${pct ?? 0}%` }} />
              </div>
              <div className="text-foreground/75 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {masteryLabel(t.mastery)} · {t.answered} {t.answered === 1 ? "resposta" : "respostas"}
                  {sure && sure.total > 0 && sure.wrongRate! > 0 && (
                    <> · com certeza erra {Math.round(sure.wrongRate! * 100)}%</>
                  )}
                </span>
                <PracticeButton subjectId={subjectId} topicId={t.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

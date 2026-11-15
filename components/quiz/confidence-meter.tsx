import { CONFIDENCE_LABELS, falseCertaintyMessage, type ConfidenceStat } from "@/lib/quiz/confidence";

/** D7 — mostra a taxa de erro por nível de confiança. */
export function ConfidenceMeter({ stats }: { stats: ConfidenceStat[] }) {
  const message = falseCertaintyMessage(stats);
  const total = stats.reduce((s, x) => s + x.total, 0);
  if (total === 0) return <p className="text-muted-foreground text-sm">Responda questões para ver o medidor.</p>;

  return (
    <div className="grid gap-3" data-testid="confidence-meter">
      {message && <p className="font-medium">{message}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        {stats.map((s) => {
          const pct = s.wrongRate == null ? null : Math.round(s.wrongRate * 100);
          return (
            <div key={s.level} className="bg-muted rounded-xl p-3 text-sm">
              <div className="text-muted-foreground">{CONFIDENCE_LABELS[s.level]}</div>
              <div className="text-lg font-semibold">{pct == null ? "—" : `${pct}% de erro`}</div>
              <div className="text-muted-foreground text-xs">
                {s.total} {s.total === 1 ? "resposta" : "respostas"}
              </div>
              {pct != null && (
                <div className="bg-background mt-2 h-1.5 overflow-hidden rounded-full">
                  <div className="bg-destructive/70 h-full" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

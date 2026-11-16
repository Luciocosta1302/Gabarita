import Link from "next/link";

import type { AttemptResult } from "@/lib/quiz/record";
import { criterionLabel, PASSING_SCORE } from "@/lib/quiz/rubric";
import { cn } from "@/lib/utils";

/** D10 — correção da discursiva: nota, critérios da rubrica, acertos/faltas/erros e resposta-modelo. */
export function OpenFeedback({ result, questionId }: { result: AttemptResult; questionId: string }) {
  const f = result.feedback!;
  const passed = f.score >= PASSING_SCORE;
  return (
    <div role="status" data-testid="open-feedback" className={cn("grid gap-3 rounded-xl p-4 text-sm", passed ? "bg-pastel-mint" : "bg-pastel-peach")}>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold" data-testid="open-score">
          {f.score.toLocaleString("pt-BR")}
        </span>
        <span>/ 10 {passed ? "· boa resposta!" : "· dá para melhorar"}</span>
      </p>
      <ul className="grid gap-2">
        {f.criteria.map((c) => (
          <li key={c.criterion} className="grid gap-1">
            <span className="flex justify-between font-medium">
              {criterionLabel(c.criterion)} <span>{c.score}/10</span>
            </span>
            <span className="bg-background/60 h-1.5 overflow-hidden rounded-full">
              <span className="bg-primary block h-full" style={{ width: `${c.score * 10}%` }} />
            </span>
            <span className="text-foreground/75 text-xs">{c.comment}</span>
          </li>
        ))}
      </ul>
      {f.correct_points.length > 0 && <List title="✓ Acertou" items={f.correct_points} />}
      {f.missing_points.length > 0 && <List title="○ Faltou" items={f.missing_points} />}
      {f.wrong_points.length > 0 && <List title="✗ Está errado" items={f.wrong_points} />}
      <p>{f.overall}</p>
      <details>
        <summary className="cursor-pointer font-medium">Ver resposta-modelo</summary>
        <p className="mt-1">{result.answer}</p>
      </details>
      {result.chunk_id && (
        <Link href={`/chunks/${result.chunk_id}?q=${questionId}`} target="_blank" className="text-primary font-medium underline">
          Ver no material{result.source_page != null ? ` (p. ${result.source_page})` : ""}
        </Link>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <span className="font-medium">{title}</span>
      <ul className="list-disc pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

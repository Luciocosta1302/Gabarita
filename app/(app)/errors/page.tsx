import type { QueryData } from "@supabase/supabase-js";
import Link from "next/link";
import { z } from "zod";

import { AutoRefresh } from "@/components/layout/auto-refresh";
import { QuestionCard } from "@/components/quiz/question-card";
import { CONFIDENCE_LABELS, type Confidence } from "@/lib/quiz/confidence";
import { letterToIndex } from "@/lib/quiz/options";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ToolGuide } from "@/components/tutorials/tutorials";

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const subjectId = z.uuid().safeParse(subject).success ? subject! : null;

  const supabase = await createClient();
  let query = entriesQuery(supabase)
    .order("resolved_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (subjectId) query = query.eq("attempts.questions.subject_id", subjectId);
  const { data: entries } = await query;

  const pending = (entries ?? []).some((e) => e.followup_status === "pending");
  const open = (entries ?? []).filter((e) => !e.resolved_at);
  const resolved = (entries ?? []).filter((e) => e.resolved_at);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh active={pending} every={4000} />
      <div>
        <h1 className="text-3xl font-bold">Caderno de erros</h1>
        <p className="text-muted-foreground text-sm">
          Toda questão que você erra vem para cá com a explicação, o trecho do material e uma questão parecida para
          tentar de novo. Acertou a parecida? O erro fica resolvido.
        </p>
        {subjectId && (
          <Link href="/errors" className="text-primary text-sm underline">
            Ver de todas as matérias
          </Link>
        )}
      </div>
      <ToolGuide id="erros" />

      {!entries?.length && <p className="text-muted-foreground">Nenhum erro por aqui. Bora fazer questões!</p>}

      <ul className="grid gap-4" data-testid="error-list">
        {open.map((e) => (
          <ErrorEntry key={e.id} entry={e} />
        ))}
      </ul>

      {resolved.length > 0 && (
        <details className="grid gap-4">
          <summary className="cursor-pointer font-semibold">Resolvidos ({resolved.length})</summary>
          <ul className="mt-4 grid gap-4">
            {resolved.map((e) => (
              <ErrorEntry key={e.id} entry={e} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function entriesQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("error_notebook").select(
    `id, why_wrong, followup_status, resolved_at, created_at,
     attempts!inner(answer, confidence, questions!inner(id, subject_id, stem, options_json, answer, explanation, chunk_id, source_page, subjects(name))),
     followup:questions!error_notebook_followup_question_id_fkey(id, stem, options_json)`,
  );
}
type Entry = QueryData<ReturnType<typeof entriesQuery>>[number];

function ErrorEntry({ entry }: { entry: Entry }) {
  const a = entry.attempts;
  const q = a.questions;
  const options = (q.options_json as string[]) ?? [];
  const resolved = !!entry.resolved_at;

  return (
    <li data-testid="error-entry" className={cn("bg-card grid gap-4 rounded-2xl border p-5 shadow-sm", resolved && "opacity-75")}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="bg-pastel-lilac rounded-full px-2.5 py-0.5">{q.subjects?.name}</span>
        <span className="text-muted-foreground">
          {new Date(entry.created_at).toLocaleDateString("pt-BR")}
          {a.confidence && ` · você marcou "${CONFIDENCE_LABELS[a.confidence as Confidence]}"`}
          {resolved && " · ✓ resolvido"}
        </span>
      </div>

      <div className="grid gap-1 text-sm">
        <p className="font-medium">{q.stem}</p>
        <p>
          Você marcou <strong>{a.answer}</strong> ({options[letterToIndex(a.answer)]}). Certa: <strong>{q.answer}</strong> (
          {options[letterToIndex(q.answer)]}).
        </p>
      </div>

      <div className="bg-pastel-rose/60 grid gap-1 rounded-xl p-3 text-sm">
        <span className="font-semibold">Por que errou</span>
        {entry.why_wrong ? (
          <p data-testid="why-wrong">{entry.why_wrong}</p>
        ) : entry.followup_status === "error" ? (
          <p>Não foi possível gerar a explicação.</p>
        ) : (
          <p className="text-muted-foreground">Analisando seu erro...</p>
        )}
        {q.explanation && <p className="text-foreground/80">{q.explanation}</p>}
        {q.chunk_id && (
          <Link href={`/chunks/${q.chunk_id}?q=${q.id}`} className="text-primary font-medium underline">
            Ver no material{q.source_page != null ? ` (p. ${q.source_page})` : ""}
          </Link>
        )}
      </div>

      {entry.followup && !resolved && (
        <div className="grid gap-2 rounded-xl border border-dashed p-4" data-testid="followup">
          <span className="text-sm font-semibold">Tente uma parecida</span>
          <QuestionCard
            question={{ id: entry.followup.id, stem: entry.followup.stem, options: (entry.followup.options_json as string[]) ?? [] }}
          />
        </div>
      )}
      {!entry.followup && entry.followup_status === "pending" && (
        <p className="text-muted-foreground text-sm" data-testid="followup-pending">
          Gerando uma questão parecida...
        </p>
      )}
    </li>
  );
}

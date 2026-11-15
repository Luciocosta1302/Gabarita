import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Highlighted } from "@/components/materials/highlighted";
import { SummaryButton } from "@/components/materials/summary-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Summary } from "@/lib/ai/prompts/summary";
import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const NEIGHBORS = 1;

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chunk?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const chunkId = z.uuid().safeParse(sp.chunk).success ? sp.chunk! : null;
  const questionId = z.uuid().safeParse(sp.q).success ? sp.q! : null;

  const supabase = await createClient();
  const { data: material } = await supabase
    .from("materials")
    .select("id, subject_id, title, type, status, page_count, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!material) notFound();

  const isPaged = material.type === "pdf" || material.type === "image";
  const pageWord = isPaged ? "Página" : "Parte";

  // Trecho em foco (vindo de uma questão) + vizinhos; sem foco, o material inteiro.
  let focus: { chunk_index: number } | null = null;
  if (chunkId) {
    const { data } = await supabase.from("chunks").select("chunk_index").eq("id", chunkId).eq("material_id", id).maybeSingle();
    focus = data;
  }
  let chunksQuery = supabase.from("chunks").select("id, page, content, chunk_index").eq("material_id", id).order("chunk_index");
  if (focus) {
    chunksQuery = chunksQuery
      .gte("chunk_index", focus.chunk_index - NEIGHBORS)
      .lte("chunk_index", focus.chunk_index + NEIGHBORS);
  }

  const [{ data: chunks }, { data: summaryRow }, { data: question }, signed] = await Promise.all([
    chunksQuery.limit(1000),
    supabase.from("summaries").select("content_json, created_at").eq("material_id", id).maybeSingle(),
    questionId
      ? supabase.from("questions").select("source_quote, stem").eq("id", questionId).maybeSingle()
      : Promise.resolve({ data: null }),
    material.type === "pdf" && material.storage_path
      ? supabase.storage.from(MATERIALS_BUCKET).createSignedUrl(`${material.storage_path}/001.pdf`, 60 * 60)
      : Promise.resolve({ data: null }),
  ]);
  const summary = summaryRow?.content_json as Summary | undefined;
  const focusChunk = chunks?.find((c) => c.id === chunkId);
  const pdfUrl = signed.data?.signedUrl;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/subjects/${material.subject_id}`} className="text-muted-foreground text-sm hover:underline">
          ← Voltar para a matéria
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{material.title}</h1>
        <p className="text-muted-foreground text-sm">
          {material.page_count ? `${material.page_count} ${isPaged ? "páginas" : "partes"}` : ""}
          {pdfUrl && (
            <>
              {" · "}
              <a
                href={`${pdfUrl}#page=${focusChunk?.page ?? 1}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Abrir PDF original{focusChunk?.page ? ` na página ${focusChunk.page}` : ""}
              </a>
            </>
          )}
        </p>
      </div>

      {chunkId && (
        <Card id="trecho" className="border-primary/40">
          <CardHeader>
            <CardTitle>Trecho de onde saiu a questão</CardTitle>
            {question?.stem && <p className="text-muted-foreground text-sm">“{question.stem}”</p>}
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            {!focusChunk && <p className="text-muted-foreground">Trecho não encontrado (o material pode ter sido reprocessado).</p>}
            {chunks?.map((c) => {
              const isFocus = c.id === chunkId;
              return (
                <div
                  key={c.id}
                  data-testid={isFocus ? "focus-chunk" : undefined}
                  className={cn("rounded-xl border p-4", isFocus ? "bg-card border-primary ring-primary/20 ring-2" : "opacity-60")}
                >
                  <div className="text-muted-foreground mb-2 text-xs font-medium" data-testid={isFocus ? "focus-page" : undefined}>
                    {c.page != null ? `${pageWord} ${c.page}` : "Trecho"}
                    {isFocus ? " · trecho citado" : ""}
                  </div>
                  <Highlighted text={c.content} quote={isFocus ? question?.source_quote : null} />
                </div>
              );
            })}
            <Link href={`/materials/${id}`} className="text-primary text-sm underline">
              Ver o material inteiro
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          {summary ? (
            <div className="grid gap-4" data-testid="summary">
              <p className="text-base">{summary.overview}</p>
              {summary.sections.map((s, i) => (
                <section key={i} className="grid gap-1">
                  <h3 className="font-semibold">
                    {s.heading}
                    {s.pages.length > 0 && (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        ({isPaged ? "p." : "parte"} {s.pages.join(", ")})
                      </span>
                    )}
                  </h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {s.points.map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Ainda não há resumo deste material.</p>
          )}
          {material.status === "ready" && (
            <SummaryButton materialId={id} label={summary ? "Gerar resumo de novo" : "Gerar resumo"} />
          )}
        </CardContent>
      </Card>

      {!chunkId && (
        <Card>
          <CardHeader>
            <CardTitle>Texto extraído</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            {chunks?.map((c) => (
              <div key={c.id} className="grid gap-1 border-b pb-4 last:border-0">
                <span className="text-muted-foreground text-xs">{c.page != null ? `${pageWord} ${c.page}` : "Trecho"}</span>
                <Highlighted text={c.content} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

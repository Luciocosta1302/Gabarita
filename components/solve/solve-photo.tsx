"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PhotoSolution } from "@/lib/ai/prompts/solve-photo";
import { postJSON, selectClass } from "@/lib/api/client";
import type { MaterialMatch } from "@/lib/solve/service";
import { cn } from "@/lib/utils";

/** Reduz a foto no navegador (lado maior 1600 px, JPEG) antes de enviar. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

const CONFIDENCE = { alta: "Resposta confiável", media: "Confira com seu material", baixa: "Pouca certeza — confira com o professor" } as const;

export function SolvePhoto({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ solution: PhotoSolution; matches: MaterialMatch[] } | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const image_base64 = await shrink(file);
      setResult(await postJSON("/api/solve-photo", { image_base64, mime: "image/jpeg", subject_id: subjectId || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao resolver.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="photo">Foto da questão</Label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="border-input rounded-xl border p-2 text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setResult(null);
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </div>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Foto enviada" className="max-h-72 justify-self-start rounded-xl border object-contain" />
      )}
      {subjects.length > 0 && (
        <div className="grid gap-2">
          <Label htmlFor="photo-subject">Procurar a matéria em</Label>
          <select id="photo-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectClass}>
            <option value="">Todas as minhas matérias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button onClick={submit} disabled={!file || busy} className="justify-self-start">
        {busy ? "Resolvendo..." : "Resolver passo a passo"}
      </Button>

      {result && !result.solution.readable && (
        <p className="bg-pastel-peach rounded-xl p-4 text-sm">Não consegui ler uma questão nessa foto. {result.solution.question}</p>
      )}
      {result?.solution.readable && (
        <div className="grid gap-4" data-testid="photo-solution">
          <div className="bg-card grid gap-3 rounded-2xl border p-5 shadow-sm">
            <span className="text-muted-foreground text-xs">Questão</span>
            <p className="whitespace-pre-wrap">{result.solution.question}</p>
            <span className="text-muted-foreground text-xs">Resolução</span>
            <ol className="grid list-decimal gap-2 pl-5 text-sm">
              {result.solution.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="bg-pastel-mint rounded-xl p-3 font-semibold" data-testid="photo-answer">
              Resposta: {result.solution.answer}
            </p>
            <span
              className={cn(
                "justify-self-start rounded-full px-2.5 py-0.5 text-xs",
                result.solution.confidence === "alta" ? "bg-pastel-mint" : result.solution.confidence === "media" ? "bg-pastel-peach" : "bg-pastel-rose",
              )}
            >
              {CONFIDENCE[result.solution.confidence]}
            </span>
          </div>
          <div className="bg-pastel-lilac/50 grid gap-2 rounded-2xl p-5" data-testid="photo-matches">
            <span className="font-semibold">Onde está essa matéria no seu material</span>
            {result.matches.length === 0 ? (
              <p className="text-sm">Não encontrei esse assunto nos seus materiais. Que tal enviar o conteúdo dele?</p>
            ) : (
              result.matches.map((m) => (
                <Link key={m.chunk_id} href={`/chunks/${m.chunk_id}`} className="bg-card hover:bg-accent grid gap-1 rounded-xl border p-3 text-sm">
                  <span className="font-medium">
                    {m.material_title}
                    {m.page != null ? `, p. ${m.page}` : ""} <span className="text-muted-foreground text-xs">· {m.subject_name}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">{m.preview}…</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

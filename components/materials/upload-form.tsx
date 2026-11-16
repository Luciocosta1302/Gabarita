"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON } from "@/lib/api/client";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT, materialTypeFor } from "@/lib/validation/upload";

type Created = { material_id: string; uploads: { name: string; path: string }[] };

export function UploadForm({ subjectId, purpose = "study" }: { subjectId: string; purpose?: "study" | "past_exam" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"files" | "text">("files");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      if (mode === "text") {
        setBusy("Enviando texto...");
        await postJSON<Created>("/api/upload", {
          kind: "text",
          subject_id: subjectId,
          purpose,
          title: String(form.get("title") ?? ""),
          text: String(form.get("text") ?? ""),
        });
      } else {
        const files = Array.from(fileRef.current?.files ?? []);
        if (!files.length) throw new Error("Escolha um arquivo.");
        const big = files.find((f) => f.size > MAX_UPLOAD_BYTES);
        if (big) throw new Error(`"${big.name}" passa de 20 MB.`);
        const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
        const kind = materialTypeFor(meta);
        if ("error" in kind) throw new Error(kind.error);

        setBusy("Preparando...");
        const created = await postJSON<Created>("/api/upload", {
          kind: "files",
          subject_id: subjectId,
          purpose,
          title: String(form.get("title") ?? "") || undefined,
          files: meta,
        });

        // Envia direto para o Storage (o arquivo não passa pelo nosso servidor).
        const supabase = createClient();
        for (const [i, up] of created.uploads.entries()) {
          setBusy(`Enviando ${i + 1} de ${created.uploads.length}...`);
          const file = files[i];
          const { error: upError } = await supabase.storage
            .from("materials")
            .upload(up.path, file, { contentType: file.type || undefined });
          if (upError) throw new Error(`Falha ao enviar "${file.name}": ${upError.message}`);
        }
        await postJSON("/api/upload/complete", { material_id: created.material_id });
      }
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-4">
      <div className="flex gap-2" role="tablist">
        {(["files", "text"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {m === "files" ? "Arquivo ou fotos" : "Colar texto"}
          </Button>
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="material-title">Título {mode === "files" && "(opcional)"}</Label>
        <Input id="material-title" name="title" maxLength={200} placeholder="Ex.: Capítulo 3 — Funções" />
      </div>

      {mode === "files" ? (
        <div className="grid gap-2">
          <Label htmlFor="material-file">
            {purpose === "past_exam" ? "Prova antiga: PDF, DOCX ou fotos" : "PDF, DOCX ou fotos (várias de uma vez) — ou áudio da aula"}
          </Label>
          <Input id="material-file" ref={fileRef} type="file" accept={ACCEPT} multiple className="h-auto py-2" />
          <p className="text-muted-foreground text-xs">
            Até 20 MB por arquivo e 100 páginas no plano grátis.{purpose === "study" && " Áudio de aula: MP3 ou WAV."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="material-text">Texto</Label>
          <Textarea id="material-text" name="text" rows={8} placeholder="Cole aqui suas anotações ou um texto..." />
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!!busy} className="justify-self-start">
        {busy ?? (purpose === "past_exam" ? "Enviar prova" : "Enviar material")}
      </Button>
    </form>
  );
}

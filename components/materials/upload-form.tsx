"use client";

import { FileAudio, FileImage, FileText, FileType2, Presentation, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FluidTabs } from "@/components/ui/fluid-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postJSON, selectClass } from "@/lib/api/client";
import { explainStorageError } from "@/lib/api/explain";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ACCEPT, materialTypeFor } from "@/lib/validation/upload";

type Created = { material_id: string; uploads: { name: string; path: string }[] };
type Mode = "files" | "link" | "text";

/** Formatos aceitos, mostrados como "selos" na área de soltar o arquivo. */
const FORMATS = [
  { icon: FileText, label: "PDF" },
  { icon: Presentation, label: "Slides (PPTX)" },
  { icon: FileType2, label: "Word (DOCX)" },
  { icon: FileImage, label: "Fotos" },
  { icon: FileAudio, label: "Áudio da aula" },
];

function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Envio de material. Na página da matéria a matéria já vem escolhida; em /adicionar o aluno escolhe
 * (`folders`, opcional: sem pasta vai para "Sem pasta") e, ao terminar, abre a conversa do arquivo (`openChat`).
 */
export function UploadForm({
  subjectId,
  folders,
  purpose = "study",
  initialMode = "files",
  openChat = false,
}: {
  subjectId?: string;
  /** escolher a pasta no próprio formulário (pastas do aluno, sem a "Sem pasta") */
  folders?: { id: string; name: string }[];
  purpose?: "study" | "past_exam";
  initialMode?: Mode;
  /** depois de enviar, abre a conversa do arquivo; sem isso, só atualiza a página */
  openChat?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(purpose === "past_exam" && initialMode === "link" ? "files" : initialMode);
  // "" = Sem pasta; "__new__" = criar uma pasta agora
  const [folder, setFolder] = useState(subjectId ?? "");
  const [newFolder, setNewFolder] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function pick(list: FileList | null) {
    setError(null);
    setSent(false);
    setFiles(Array.from(list ?? []));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSent(false);
    const form = new FormData(e.currentTarget);
    try {
      let subject = folder;
      if (!subject || subject === "__new__") {
        if (subject === "__new__" && !newFolder.trim()) throw new Error("Escreva o nome da nova pasta (ou escolha “Sem pasta”).");
        setBusy("Preparando a pasta...");
        subject = (
          await postJSON<{ subject_id: string }>("/api/folders", subject === "__new__" ? { name: newFolder.trim() } : { inbox: true })
        ).subject_id;
        if (folder === "__new__") {
          setFolder(subject);
          setNewFolder("");
        }
      }
      let materialId: string;
      if (mode === "link") {
        setBusy("Enviando link...");
        materialId = (await postJSON<Created>("/api/upload", {
          kind: "link",
          subject_id: subject,
          url: String(form.get("url") ?? ""),
          title: String(form.get("title") ?? ""),
        })).material_id;
      } else if (mode === "text") {
        setBusy("Enviando texto...");
        materialId = (await postJSON<Created>("/api/upload", {
          kind: "text",
          subject_id: subject,
          purpose,
          title: String(form.get("title") ?? ""),
          text: String(form.get("text") ?? ""),
        })).material_id;
      } else {
        if (!files.length) throw new Error("Nenhum arquivo escolhido. Toque na área tracejada para escolher o arquivo.");
        const big = files.find((f) => f.size > MAX_UPLOAD_BYTES);
        if (big) throw new Error(`“${big.name}” tem ${sizeLabel(big.size)} e o limite é 20 MB. Divida o arquivo (ex.: em dois PDFs) ou envie fotos das páginas.`);
        const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }));
        const kind = materialTypeFor(meta);
        if ("error" in kind) throw new Error(kind.error);

        setBusy("Preparando...");
        const created = await postJSON<Created>("/api/upload", {
          kind: "files",
          subject_id: subject,
          purpose,
          title: String(form.get("title") ?? "") || undefined,
          files: meta,
        });

        // Envia direto para o Storage (o arquivo não passa pelo nosso servidor).
        const supabase = createClient();
        for (const [i, up] of created.uploads.entries()) {
          setBusy(`Enviando ${i + 1} de ${created.uploads.length}...`);
          const file = files[i];
          const { error: upError } = await supabase.storage.from("materials").upload(up.path, file, { contentType: file.type || undefined });
          if (upError) throw new Error(explainStorageError(file.name, upError.message));
        }
        await postJSON("/api/upload/complete", { material_id: created.material_id });
        materialId = created.material_id;
      }
      formRef.current?.reset();
      setFiles([]);
      setSent(true);
      if (openChat) router.push(`/chat/${subject}?material=${materialId}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setBusy(null);
    }
  }

  const modes: Mode[] = purpose === "study" ? ["files", "link", "text"] : ["files", "text"];

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-4">
      <FluidTabs
        label="Como enviar o material"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        items={modes.map((m) => ({
          value: m,
          label: m === "files" ? "Arquivo" : m === "link" ? "Link ou YouTube" : "Colar texto",
        }))}
      />

      {mode === "files" ? (
        <div className="grid gap-2">
          {/* área de soltar: o input fica escondido, mas acessível pelo rótulo */}
          <label
            htmlFor="material-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (fileRef.current && e.dataTransfer.files.length) {
                fileRef.current.files = e.dataTransfer.files;
                pick(e.dataTransfer.files);
              }
            }}
            className={cn(
              "grid cursor-pointer justify-items-center gap-3 rounded-2xl border-2 border-dashed border-ink/40 bg-card px-4 py-7 text-center transition-colors focus-within:border-ink focus-within:ring-2 focus-within:ring-ring hover:border-ink",
              dragging && "bg-pastel-peach border-ink",
            )}
          >
            <span className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-full border-2 border-ink shadow-[0_3px_0_var(--ink)]">
              <Upload aria-hidden className="size-5" strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg leading-tight font-extrabold">
              {purpose === "past_exam" ? "Escolha a prova antiga" : "Toque para escolher o arquivo"}
              <span className="text-muted-foreground block text-sm font-normal">ou arraste e solte aqui</span>
            </span>
            <span className="flex flex-wrap justify-center gap-1.5">
              {(purpose === "past_exam" ? FORMATS.slice(0, 4) : FORMATS).map((f) => (
                <span key={f.label} className="bg-background inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink/25 px-2.5 py-1 text-xs font-medium">
                  <f.icon aria-hidden className="size-3.5" />
                  {f.label}
                </span>
              ))}
            </span>
          </label>
          <input
            id="material-file"
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            aria-label={purpose === "past_exam" ? "Escolher arquivo da prova antiga" : "Escolher arquivo"}
            className="sr-only"
            onChange={(e) => pick(e.target.files)}
          />
          {files.length > 0 && (
            <ul className="grid gap-1.5" data-testid="picked-files">
              {files.map((f) => (
                <li key={f.name + f.size} className="bg-card flex items-center gap-2 rounded-xl border-[1.5px] border-ink/25 px-3 py-2 text-sm">
                  <FileText aria-hidden className="text-shu size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{sizeLabel(f.size)}</span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-ink inline-flex items-center gap-1 text-xs font-bold"
                  onClick={() => {
                    if (fileRef.current) fileRef.current.value = "";
                    pick(null);
                  }}
                >
                  <X aria-hidden className="size-3.5" /> Trocar arquivo
                </button>
              </li>
            </ul>
          )}
          <p className="text-muted-foreground text-xs">
            Um arquivo por vez (fotos: várias de uma vez, cada foto vira uma página). Até 20 MB e 100 páginas.
            {purpose === "study" && " Áudio: MP3 ou WAV. Arquivo .ppt ou .doc antigo? Salve como PPTX, DOCX ou PDF."}
          </p>
        </div>
      ) : mode === "link" ? (
        <div className="grid gap-2">
          <Label htmlFor="material-url">Link da página, do PDF ou do vídeo</Label>
          <Input id="material-url" name="url" type="url" inputMode="url" required maxLength={2000} placeholder="https://..." />
          <p className="text-muted-foreground text-xs">
            Páginas da web e PDFs: o texto vira material. YouTube: a IA assiste o vídeo e transcreve a fala com os tempos (vídeo público, até uns 40
            minutos). Google Slides/Docs: baixe como PDF ou PPTX e envie em “Arquivo”. Sites que exigem login não funcionam.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="material-text">Texto</Label>
          <Textarea id="material-text" name="text" rows={8} placeholder="Cole aqui suas anotações ou um texto..." />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="material-title">{openChat ? "Nome da conversa" : "Título"} {mode !== "text" && "(opcional)"}</Label>
        <Input id="material-title" name="title" maxLength={200} placeholder="Ex.: Capítulo 3 — Funções" required={mode === "text"} />
      </div>

      {folders && (
        <div className="grid gap-2">
          <Label htmlFor="material-folder">Pasta (opcional)</Label>
          <select id="material-folder" className={selectClass} value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">Sem pasta (organizo depois)</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value="__new__">+ Nova pasta...</option>
          </select>
          {folder === "__new__" && (
            <Input
              aria-label="Nome da nova pasta"
              autoFocus
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Cálculo I, ENEM, Concurso INSS"
            />
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {sent && !openChat && (
        <p role="status" className="text-matcha text-sm font-medium">
          Recebido! O material aparece na lista abaixo e fica pronto em alguns instantes.
        </p>
      )}
      <Button type="submit" size="lg" disabled={!!busy} className="justify-self-start">
        <Upload aria-hidden className="size-4" />
        {busy ?? (purpose === "past_exam" ? "Enviar prova" : "Enviar material")}
      </Button>
    </form>
  );
}

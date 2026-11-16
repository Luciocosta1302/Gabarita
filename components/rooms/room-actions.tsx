"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";

type Opt = { id: string; name: string };

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(key: string, body: Record<string, unknown>, then?: (r: T) => void) {
    setBusy(key);
    setError(null);
    try {
      const r = await postJSON<T>("/api/rooms", body);
      then?.(r);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, run, router };
}

function Err({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  ) : null;
}

export function CreateRoomForm({ subjects }: { subjects: Opt[] }) {
  const { busy, error, run, router } = useAction();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run<{ code: string }>("create", { action: "create", name: f.get("name"), subject_id: f.get("subject_id") || undefined }, (r) =>
          router.push(`/rooms/${r.code}`),
        );
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="room-name">Nome da sala</Label>
        <Input id="room-name" name="name" required maxLength={80} placeholder="Ex.: Turma de Bio — 2º semestre" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="room-subject">Matéria (opcional)</Label>
        <select id="room-subject" name="subject_id" className={selectClass} defaultValue="">
          <option value="">—</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={!!busy}>
        {busy ? "Criando..." : "Criar sala"}
      </Button>
      <div className="sm:col-span-3">
        <Err error={error} />
      </div>
    </form>
  );
}

export function JoinRoomForm() {
  const { busy, error, run, router } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(new FormData(e.currentTarget).get("code") ?? "");
        const code = raw.trim().split("/").filter(Boolean).pop() ?? "";
        run("join", { action: "join", code }, () => router.push(`/rooms/${code.toLowerCase()}`));
      }}
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="room-code">Código ou link do convite</Label>
        <Input id="room-code" name="code" required placeholder="ex.: 3fa9c2d1b07e" />
      </div>
      <Button type="submit" variant="outline" disabled={!!busy}>
        Entrar
      </Button>
      <Err error={error} />
    </form>
  );
}

export function JoinButton({ code }: { code: string }) {
  const { busy, error, run } = useAction();
  return (
    <div className="grid gap-2">
      <Button onClick={() => run("join", { action: "join", code })} disabled={!!busy}>
        {busy ? "Entrando..." : "Entrar na sala"}
      </Button>
      <Err error={error} />
    </div>
  );
}

export function CopyInvite({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="bg-background/70 rounded-lg px-2 py-1 text-xs" data-testid="invite-link">
        {url}
      </code>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* sem área de transferência */
          }
        }}
      >
        {copied ? "Copiado!" : "Copiar link"}
      </Button>
    </div>
  );
}

export function ShareMaterialForm({ roomId, materials }: { roomId: string; materials: { id: string; title: string }[] }) {
  const { busy, error, run } = useAction();
  if (!materials.length) return <p className="text-muted-foreground text-xs">Você ainda não tem material pronto para compartilhar.</p>;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run("share", { action: "share", room_id: roomId, material_id: new FormData(e.currentTarget).get("material_id") });
      }}
    >
      <select name="material_id" aria-label="Material para compartilhar" className={`${selectClass} flex-1`}>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={!!busy}>
        Compartilhar com a turma
      </Button>
      <Err error={error} />
    </form>
  );
}

export function ImportButton({ roomMaterialId, subjects }: { roomMaterialId: string; subjects: Opt[] }) {
  const { busy, error, run } = useAction();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [done, setDone] = useState(false);
  if (!subjects.length) return <span className="text-muted-foreground text-xs">Crie uma matéria para importar.</span>;
  if (done) return <span className="text-xs">✓ Importado</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select aria-label="Importar para" className={`${selectClass} h-8`} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("import", { action: "import", room_material_id: roomMaterialId, subject_id: subjectId }, () => setDone(true))}>
        {busy ? "Importando..." : "Importar"}
      </Button>
      <Err error={error} />
    </div>
  );
}

export function CreateRoomQuizForm({ roomId, code, subjects }: { roomId: string; code: string; subjects: Opt[] }) {
  const { busy, error, run, router } = useAction();
  if (!subjects.length) return <p className="text-muted-foreground text-xs">Para criar um simulado da turma, tenha uma matéria com material pronto.</p>;
  return (
    <form
      className="grid gap-3 sm:grid-cols-3 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run<{ room_quiz_id: string }>("quiz", { action: "quiz", room_id: roomId, subject_id: f.get("subject_id"), count: Number(f.get("count")) }, (r) =>
          router.push(`/rooms/${code}/simulado/${r.room_quiz_id}`),
        );
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="rq-subject">A partir da matéria</Label>
        <select id="rq-subject" name="subject_id" className={selectClass}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rq-count">Questões</Label>
        <Input id="rq-count" name="count" type="number" min={3} max={30} defaultValue={10} />
      </div>
      <Button type="submit" disabled={!!busy}>
        {busy ? "Montando..." : "Criar simulado da turma"}
      </Button>
      <div className="sm:col-span-3">
        <Err error={error} />
      </div>
    </form>
  );
}

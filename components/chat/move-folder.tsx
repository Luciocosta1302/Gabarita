"use client";

import { FolderInput } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJSON, selectClass } from "@/lib/api/client";
import { play } from "@/lib/feedback/sound";

/** "Colocar numa pasta": move o arquivo (e a conversa) para uma pasta existente ou nova. */
export function MoveToFolder({ materialId, currentId, folders }: { materialId: string; currentId: string; folders: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = folders.filter((f) => f.id !== currentId);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="move-folder">
        <FolderInput aria-hidden className="size-4" />
        Colocar numa pasta
      </Button>
    );
  }

  async function move() {
    setBusy(true);
    setError(null);
    try {
      const body = target === "__new__" || !options.length ? { material_id: materialId, new_folder: name.trim() } : { material_id: materialId, subject_id: target };
      const r = await postJSON<{ subject_id: string }>("/api/materials/move", body);
      play("stamp");
      router.replace(`/chat/${r.subject_id}?material=${materialId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para mover agora. Tente de novo.");
      setBusy(false);
    }
  }

  const creating = target === "__new__" || !options.length;
  return (
    <div className="bg-card grid w-full gap-2 rounded-2xl border-2 border-ink/20 p-3" data-testid="move-folder-panel">
      {options.length > 0 && (
        <select aria-label="Pasta de destino" className={selectClass} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="" disabled>
            Escolha a pasta...
          </option>
          {options.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
          <option value="__new__">+ Nova pasta...</option>
        </select>
      )}
      {creating && (
        <Input aria-label="Nome da nova pasta" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Nome da nova pasta (ex.: Cálculo I)" />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={move} disabled={busy || (creating ? !name.trim() : !target)}>
          {busy ? "Movendo..." : "Mover"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

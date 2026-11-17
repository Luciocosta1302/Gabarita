"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON } from "@/lib/api/client";

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(url: string, body: unknown, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      await postJSON(url, body);
      setMsg({ ok: true, text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Falha ao salvar." });
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, save };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-success text-sm" : "text-destructive text-sm"}>
      {msg.text}
    </p>
  );
}

/** Nome, @usuário (o "id" público) e bio. */
export function ProfileForm({ name, username, bio, suggested }: { name: string; username: string | null; bio: string | null; suggested: string }) {
  const { busy, msg, save } = useSave();
  const [handle, setHandle] = useState(username ?? "");
  return (
    <form
      className="grid gap-4"
      data-testid="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save(
          "/api/profile",
          { name: String(f.get("name") ?? ""), username: handle || undefined, bio: String(f.get("bio") ?? "") },
          "Perfil salvo.",
        );
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="profile-name">Seu nome</Label>
        <Input id="profile-name" name="name" defaultValue={name} maxLength={80} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-username">Seu @ (só colegas das suas turmas veem)</Label>
        <div className="flex items-center gap-2">
          <span className="font-display text-ink/60 text-lg font-bold">@</span>
          <Input
            id="profile-username"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
            placeholder={suggested}
            minLength={3}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          3 a 20 letras sem acento, números ou _.{" "}
          {!handle && (
            <button type="button" className="text-shu font-bold underline-offset-2 hover:underline" onClick={() => setHandle(suggested)}>
              Usar @{suggested}
            </button>
          )}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="profile-bio">Bio (opcional)</Label>
        <Input id="profile-bio" name="bio" defaultValue={bio ?? ""} maxLength={160} placeholder="Ex.: Medicina 2027 · foco em bioquímica" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Salvando..." : "Salvar perfil"}
        </Button>
        <Msg msg={msg} />
      </div>
    </form>
  );
}

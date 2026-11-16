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

export function NameForm({ name }: { name: string }) {
  const { busy, msg, save } = useSave();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save("/api/profile", { name: new FormData(e.currentTarget).get("name") }, "Nome salvo.");
      }}
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="profile-name">Seu nome</Label>
        <Input id="profile-name" name="name" defaultValue={name} maxLength={80} required />
      </div>
      <Button type="submit" variant="outline" disabled={busy}>
        Salvar
      </Button>
      <Msg msg={msg} />
    </form>
  );
}

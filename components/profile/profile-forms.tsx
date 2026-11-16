"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; upgrade?: boolean } | null>(null);
  async function save(url: string, body: unknown, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      await postJSON(url, body);
      setMsg({ ok: true, text: okText });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Falha ao salvar.", upgrade: !!(e as { upgrade?: boolean }).upgrade });
    } finally {
      setBusy(false);
    }
  }
  return { busy, msg, save };
}

function Msg({ msg }: { msg: { ok: boolean; text: string; upgrade?: boolean } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-success text-sm" : "text-destructive text-sm"}>
      {msg.text}{" "}
      {msg.upgrade && (
        <Link href="/planos" className="underline">
          Ver planos
        </Link>
      )}
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

export function WhatsAppForm({ phone, optIn, hour, pro }: { phone: string; optIn: boolean; hour: number; pro: boolean }) {
  const { busy, msg, save } = useSave();
  const test = useSave();
  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 sm:grid-cols-3 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save(
            "/api/whatsapp/settings",
            { phone: String(f.get("phone") ?? "") || undefined, opt_in: f.get("opt_in") === "on", hour: Number(f.get("hour")) },
            "Configuração do WhatsApp salva.",
          );
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="wa-phone">Número do WhatsApp</Label>
          <Input id="wa-phone" name="phone" defaultValue={phone} placeholder="(11) 98765-4321" inputMode="tel" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="wa-hour">Horário</Label>
          <select id="wa-hour" name="hour" defaultValue={hour} className={selectClass}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="opt_in" defaultChecked={optIn} className="accent-primary size-4" />
          Receber 5 questões por dia
        </label>
        <Button type="submit" disabled={busy} className="justify-self-start">
          Salvar
        </Button>
        <div className="sm:col-span-3">
          <Msg msg={msg} />
        </div>
      </form>
      {pro && phone && (
        <div className="grid gap-1">
          <Button variant="secondary" size="sm" className="justify-self-start" disabled={test.busy} onClick={() => test.save("/api/whatsapp/test", {}, "Questões enviadas! Responda COMEÇAR no WhatsApp.")}>
            Mandar as questões de hoje agora
          </Button>
          <Msg msg={test.msg} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postJSON } from "@/lib/api/client";

/** Apagar a conta: pede para digitar APAGAR, depois volta para a página inicial. */
export function DeleteAccount() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await postJSON("/api/account/delete", { confirm: text.trim() });
          window.location.assign("/?conta=apagada");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não deu para apagar agora. Tente de novo.");
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-1.5 text-sm">
        Para confirmar, digite <strong>APAGAR</strong>
        <Input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="max-w-xs" aria-label="Digite APAGAR para confirmar" />
      </label>
      <Button type="submit" variant="destructive" className="justify-self-start" disabled={busy || text.trim() !== "APAGAR"} data-testid="delete-account">
        {busy ? "Apagando..." : "Apagar minha conta para sempre"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

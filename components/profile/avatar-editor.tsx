"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarFigure } from "@/components/avatar/avatar";
import { CHARACTERS } from "@/components/brand/character";
import { Button } from "@/components/ui/button";
import { FluidTabs } from "@/components/ui/fluid-tabs";
import { postJSON } from "@/lib/api/client";
import { type Avatar, BACKGROUNDS, COLORS, HEAD_ITEMS, lockedParts, NECK_ITEMS, type Who } from "@/lib/avatar/avatar";
import { petals } from "@/lib/feedback/celebrate";
import { play } from "@/lib/feedback/sound";
import { cn } from "@/lib/utils";

type Tab = "who" | "color" | "head" | "neck" | "bg";
const TABS: { value: Tab; label: string }[] = [
  { value: "who", label: "Quem" },
  { value: "color", label: "Cor" },
  { value: "head", label: "Cabeça" },
  { value: "neck", label: "Pescoço" },
  { value: "bg", label: "Fundo" },
];

/** Monte o seu personagem: escolhe quem, cor, roupas e fundo, vendo na hora. Itens acima do nível ficam com cadeado. */
export function AvatarEditor({ initial, level }: { initial: Avatar; level: number }) {
  const router = useRouter();
  const [a, setA] = useState<Avatar>(initial);
  const [tab, setTab] = useState<Tab>("who");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [popKey, setPopKey] = useState(0);
  const changed = JSON.stringify(a) !== JSON.stringify(initial);

  function pick(next: Partial<Avatar>) {
    setA((cur) => {
      const merged = { ...cur, ...next };
      // trocou de personagem: usa a primeira cor dele
      if (next.who && next.who !== cur.who) merged.color = COLORS[next.who][0].id;
      return merged;
    });
    setPopKey((k) => k + 1);
    setMsg(null);
    play("tap");
  }

  async function save(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    setBusy(true);
    setMsg(null);
    try {
      await postJSON("/api/profile", { avatar: a });
      play("complete");
      petals(btn, 16);
      setMsg({ ok: true, text: "Avatar salvo! Ele aparece no menu, na Comunidade e na sua turma." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Não deu para salvar agora. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  type Opt = { id: string; label: string; level: number; preview: Avatar; swatch?: string };
  const options: Opt[] =
    tab === "who"
      ? (["mochi", "daru", "fuku"] as Who[]).map((w) => ({ id: w, label: CHARACTERS[w].name, level: 1, preview: { ...a, who: w, color: COLORS[w][0].id } }))
      : tab === "color"
        ? COLORS[a.who].map((c) => ({ id: c.id, label: c.label, level: c.level, preview: { ...a, color: c.id } }))
        : tab === "head"
          ? HEAD_ITEMS.map((h) => ({ id: h.id, label: h.label, level: h.level, preview: { ...a, head: h.id } }))
          : tab === "neck"
            ? NECK_ITEMS.map((n) => ({ id: n.id, label: n.label, level: n.level, preview: { ...a, neck: n.id } }))
            : BACKGROUNDS.map((b) => ({ id: b.id, label: b.label, level: b.level, preview: { ...a, bg: b.id }, swatch: b.color }));
  const current = tab === "who" ? a.who : tab === "color" ? a.color : tab === "head" ? a.head : tab === "neck" ? a.neck : a.bg;
  const locked = lockedParts(a, level);

  return (
    <div className="grid gap-5 md:grid-cols-[14rem_1fr]" data-testid="avatar-editor">
      {/* prévia ao vivo */}
      <div className="grid content-start justify-items-center gap-3 md:sticky md:top-6">
        <div
          className="grid aspect-square w-44 place-items-end overflow-hidden rounded-full border-[3px] border-ink shadow-[0_5px_0_var(--ink)] transition-colors duration-300 md:w-52"
          style={{ background: BACKGROUNDS.find((b) => b.id === a.bg)?.color }}
        >
          <AvatarFigure key={popKey} avatar={a} className="animate-char-pop w-[86%] translate-y-[6%]" title="Prévia do seu avatar" />
        </div>
        <p className="text-muted-foreground text-center text-xs">{CHARACTERS[a.who].personality}</p>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <FluidTabs label="O que personalizar" value={tab} onChange={setTab} items={TABS} />
        <div role="radiogroup" aria-label={TABS.find((t) => t.value === tab)!.label} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {options.map((o) => {
            const isLocked = o.level > level;
            const selected = current === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={isLocked ? `${o.label} (libera no nível ${o.level})` : o.label}
                onClick={() =>
                  pick(
                    tab === "who"
                      ? { who: o.id as Who }
                      : tab === "color"
                        ? { color: o.id }
                        : tab === "head"
                          ? { head: o.id as Avatar["head"] }
                          : tab === "neck"
                            ? { neck: o.id as Avatar["neck"] }
                            : { bg: o.id as Avatar["bg"] },
                  )
                }
                className={cn(
                  "tap-spring relative grid justify-items-center gap-1 rounded-2xl border-2 p-2 text-center text-[11px] leading-tight font-bold",
                  selected ? "border-ink bg-accent shadow-[0_3px_0_var(--ink)]" : "bg-card border-ink/20 hover:border-ink/60",
                  isLocked && "opacity-70",
                )}
              >
                {o.swatch ? (
                  <span className="mt-1 mb-1 size-12 rounded-full border-2 border-ink" style={{ background: o.swatch }} />
                ) : (
                  <AvatarFigure avatar={o.preview} className={cn("w-14", isLocked && "grayscale")} />
                )}
                <span>{o.label}</span>
                {isLocked && (
                  <span className="bg-ink text-washi absolute top-1 right-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px]">
                    <Lock aria-hidden className="size-2.5" /> {o.level}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {tab === "head" && <p className="text-muted-foreground text-xs">Hachimaki 必勝 (“vitória certa”) é a faixa que estudantes japoneses usam antes da prova.</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy || !changed || locked.length > 0} data-testid="save-avatar">
            {busy ? "Salvando..." : "Salvar avatar"}
          </Button>
          {locked.length > 0 && (
            <p className="text-muted-foreground text-xs">
              <Lock aria-hidden className="mr-1 inline size-3" />
              Você está no nível {level}. {locked.join(", ")} — estude mais para liberar.
            </p>
          )}
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-matcha text-sm font-medium" : "text-destructive text-sm"}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

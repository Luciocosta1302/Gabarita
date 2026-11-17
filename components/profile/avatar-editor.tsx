"use client";

import { GraduationCap, Image as ImageIcon, Lock, type LucideIcon, Palette, Shirt, Smile } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarFigure } from "@/components/avatar/avatar";
import { CHARACTERS } from "@/components/brand/character";
import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { type Avatar, BACKGROUNDS, COLORS, HEAD_ITEMS, lockedParts, NECK_ITEMS, type Who } from "@/lib/avatar/avatar";
import { petals } from "@/lib/feedback/celebrate";
import { play } from "@/lib/feedback/sound";
import { cn } from "@/lib/utils";

type Tab = "who" | "color" | "head" | "neck" | "bg";
const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "who", label: "Quem", icon: Smile },
  { value: "color", label: "Cor", icon: Palette },
  { value: "head", label: "Cabeça", icon: GraduationCap },
  { value: "neck", label: "Pescoço", icon: Shirt },
  { value: "bg", label: "Fundo", icon: ImageIcon },
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

  const saveBlock = (
    <div className="grid min-w-0 gap-1 md:justify-items-center">
      <Button
        onClick={save}
        disabled={busy || !changed || locked.length > 0}
        variant={changed ? "default" : "outline"}
        size="sm"
        className="md:h-10 md:px-5"
        data-testid="save-avatar"
      >
        {busy ? "Salvando..." : changed ? "Salvar avatar" : "Avatar salvo ✓"}
      </Button>
      {locked.length > 0 && (
        <p className="text-muted-foreground text-[11px] leading-snug md:text-center">
          <Lock aria-hidden className="mr-0.5 inline size-3" />
          Nível {level}: {locked.join(", ")}.
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:gap-5" data-testid="avatar-editor">
      {/* prévia ao vivo: no celular fica presa no topo (vê a mudança sem rolar); no computador, coluna ao lado */}
      <div className="bg-card/95 sticky top-[60px] z-10 -mx-6 flex items-center gap-3 border-b-2 border-ink/10 px-6 py-2 backdrop-blur md:top-6 md:mx-0 md:grid md:content-start md:justify-items-center md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div
          className="grid aspect-square w-20 shrink-0 place-items-end overflow-hidden rounded-full border-[3px] border-ink shadow-[0_3px_0_var(--ink)] transition-colors duration-300 md:w-52 md:shadow-[0_5px_0_var(--ink)]"
          style={{ background: BACKGROUNDS.find((b) => b.id === a.bg)?.color }}
        >
          <AvatarFigure key={popKey} avatar={a} className="animate-char-pop w-[86%] translate-y-[6%]" title="Prévia do seu avatar" />
        </div>
        <div className="grid min-w-0 flex-1 gap-1.5 md:flex-none md:justify-items-center">
          <p className="text-sm font-bold md:hidden">{CHARACTERS[a.who].name}</p>
          <p className="text-muted-foreground hidden text-center text-xs md:block">{CHARACTERS[a.who].personality}</p>
          {saveBlock}
        </div>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        {/* abas em grade: as 5 cabem na tela, sem deslizar */}
        <div role="tablist" aria-label="O que personalizar" className="grid grid-cols-5 gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.value);
                  play("tap");
                }}
                className={cn(
                  "tap-spring grid min-w-0 justify-items-center gap-1 rounded-xl border-2 px-0.5 py-2 text-[11px] leading-none font-bold transition-colors sm:text-xs",
                  active ? "bg-primary text-primary-foreground border-ink shadow-[0_3px_0_var(--ink)]" : "bg-card border-ink/20 text-ink/75 hover:border-ink/60",
                )}
              >
                <Icon aria-hidden className="size-5" strokeWidth={1.9} />
                <span className="max-w-full truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
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
        {locked.length > 0 && (
          <p className="text-muted-foreground text-xs">
            <Lock aria-hidden className="mr-1 inline size-3" />
            Você está no nível {level}: o que tem cadeado libera conforme você estuda e ganha XP.
          </p>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-matcha text-sm font-medium" : "text-destructive text-sm"}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}

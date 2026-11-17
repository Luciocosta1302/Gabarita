"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJSON, selectClass } from "@/lib/api/client";
import { NEWS_SOURCES, STATES, STUDY_GOALS, type StudyGoal, suggestedSources } from "@/lib/news/catalog";
import { domainOf } from "@/lib/news/rss";
import { cn } from "@/lib/utils";

import { SourceLogo } from "./source-badge";

type Prefs = { sources: string[]; custom_feeds: string[]; state: string | null; city: string | null };

/** Escolher objetivo, fontes, região e links próprios (RSS). Usado na primeira vez e em "Ajustar fontes". */
export function NewsSetup({ goal: initialGoal, prefs, onDone }: { goal: StudyGoal | null; prefs: Prefs | null; onDone?: () => void }) {
  const router = useRouter();
  const [goal, setGoal] = useState<StudyGoal | null>(initialGoal);
  const [sources, setSources] = useState<string[]>(prefs?.sources ?? suggestedSources(initialGoal));
  const [local, setLocal] = useState(!!prefs?.state);
  const [state, setState] = useState(prefs?.state ?? "");
  const [city, setCity] = useState(prefs?.city ?? "");
  const [custom, setCustom] = useState<string[]>(prefs?.custom_feeds ?? []);
  const [newFeed, setNewFeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseGoal(g: StudyGoal) {
    setGoal(g);
    if (!prefs) setSources(suggestedSources(g)); // primeira vez: sugere as fontes do objetivo
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/news/prefs", {
        goal: goal ?? undefined,
        sources,
        custom_feeds: custom,
        state: local ? state : "",
        city: local ? city : "",
      });
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para salvar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6" data-testid="news-setup">
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-bold">1. Você estuda para quê?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STUDY_GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={goal === g.id}
              onClick={() => chooseGoal(g.id)}
              className={cn(
                "tap-spring grid rounded-2xl border-2 p-3 text-left",
                goal === g.id ? "border-ink bg-primary text-primary-foreground shadow-[0_3px_0_var(--ink)]" : "bg-card border-ink/20 hover:border-ink/60",
              )}
            >
              <span className="text-sm font-bold">{g.label}</span>
              <span className={cn("text-xs", goal === g.id ? "opacity-85" : "text-muted-foreground")}>{g.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-bold">2. De onde quer receber notícias?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {NEWS_SOURCES.map((s) => {
            const on = sources.includes(s.id);
            return (
              <label key={s.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3", on ? "border-ink bg-accent" : "bg-card border-ink/20")}>
                <input
                  type="checkbox"
                  className="accent-shu mt-1 size-4"
                  checked={on}
                  onChange={(e) => setSources(e.target.checked ? [...sources, s.id] : sources.filter((x) => x !== s.id))}
                />
                <SourceLogo domain={domainOf(s.url)} name={s.name} size={28} className="mt-0.5" />
                <span className="grid">
                  <span className="text-sm font-bold">{s.name}</span>
                  <span className="text-muted-foreground text-xs">{s.about}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-bold">3. Notícias da sua região? (opcional)</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-shu size-4" checked={local} onChange={(e) => setLocal(e.target.checked)} />
          Quero ficar atento às notícias de educação e concursos da minha região
        </label>
        {local && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="news-state">Estado</Label>
              <select id="news-state" className={selectClass} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Escolha...</option>
                {STATES.map(([uf, name]) => (
                  <option key={uf} value={uf}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="news-city">Cidade (opcional)</Label>
              <Input id="news-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="Ex.: Campinas" />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 font-bold">4. Outro jornal ou site? (opcional)</legend>
        <p className="text-muted-foreground text-xs">Cole o link do RSS do site (procure “RSS” no rodapé). Até 5.</p>
        {custom.map((u) => (
          <div key={u} className="bg-card flex items-center gap-2 rounded-xl border-[1.5px] border-ink/25 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{u}</span>
            <button type="button" aria-label={`Remover ${u}`} onClick={() => setCustom(custom.filter((x) => x !== u))} className="hover:bg-accent rounded-full p-1">
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
        {custom.length < 5 && (
          <div className="flex gap-2">
            <Input aria-label="Link do RSS" value={newFeed} onChange={(e) => setNewFeed(e.target.value)} placeholder="https://site.com.br/feed" inputMode="url" />
            <Button
              type="button"
              variant="outline"
              disabled={!newFeed.trim()}
              onClick={() => {
                const u = newFeed.trim();
                if (u && !custom.includes(u)) setCustom([...custom, u]);
                setNewFeed("");
              }}
            >
              <Plus aria-hidden className="size-4" /> Adicionar
            </Button>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button size="lg" onClick={save} disabled={busy || (local && !state)} className="justify-self-start">
        {busy ? "Salvando..." : "Salvar e ver notícias"}
      </Button>
    </div>
  );
}

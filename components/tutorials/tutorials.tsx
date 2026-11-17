"use client";

import { CircleHelp, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Character, CharacterAvatar, CHARACTERS, type CharacterPose } from "@/components/brand/character";
import { Button } from "@/components/ui/button";
import { postJSON } from "@/lib/api/client";
import { GUIDES, type GuideId, type GuideWho, WELCOME_KEY, WELCOME_STEPS } from "@/lib/tutorials/guides";
import { cn } from "@/lib/utils";

type Ctx = { seen: Set<string>; markSeen: (key: string) => void; resetAll: () => Promise<void> };
const TutorialContext = createContext<Ctx | null>(null);

/** Guarda quais tutoriais o aluno já viu (vem do perfil; muda na hora e grava no servidor). */
export function TutorialProvider({ initialSeen, children }: { initialSeen: string[]; children: React.ReactNode }) {
  const [seen, setSeen] = useState(() => new Set(initialSeen));
  const markSeen = useCallback((key: string) => {
    setSeen((s) => (s.has(key) ? s : new Set(s).add(key)));
    // keepalive: a gravação termina mesmo se o aluno trocar de página logo em seguida
    fetch("/api/tutorials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, seen: true }),
      keepalive: true,
    }).catch(() => {});
  }, []);
  const resetAll = useCallback(async () => {
    await postJSON("/api/tutorials", { key: "*", seen: false });
    setSeen(new Set());
  }, []);
  const value = useMemo(() => ({ seen, markSeen, resetAll }), [seen, markSeen, resetAll]);
  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

function useTutorials() {
  return useContext(TutorialContext);
}

function poseFor(who: GuideWho, talking = true): CharacterPose {
  if (who === "mochi") return { who, mood: talking ? "animada" : "feliz" };
  if (who === "fuku") return { who, mood: "explicando" };
  return { who, mood: "feliz", eyes: "um" };
}

/**
 * Guia curto de uma ferramenta: aberto na primeira visita; depois vira o botão "Como usar".
 * Não bloqueia a tela (fica no topo da página).
 */
export function ToolGuide({ id, className }: { id: GuideId; className?: string }) {
  const ctx = useTutorials();
  const guide = GUIDES[id];
  const firstTime = !!ctx && !ctx.seen.has(id);
  const [open, setOpen] = useState(false);
  const shown = firstTime || open;

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("text-ink/70 hover:text-ink inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] border-ink/30 px-3 py-1 text-xs font-bold hover:border-ink", className)}
      >
        <CircleHelp aria-hidden className="size-3.5" />
        Como usar
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    if (firstTime) ctx?.markSeen(id);
  };

  return (
    <section
      data-testid={`guide-${id}`}
      className={cn("bg-card animate-rise relative grid gap-3 rounded-2xl border-2 border-ink p-4 shadow-[0_3px_0_var(--ink)] sm:grid-cols-[auto_1fr] sm:gap-4", className)}
    >
      <Character pose={poseFor(guide.who)} className="hidden w-20 self-end sm:block" title="" />
      <div className="grid min-w-0 gap-2">
        <div className="flex items-center gap-2 pr-8">
          <CharacterAvatar pose={poseFor(guide.who)} className="sm:hidden" />
          <div>
            <p className="text-shu text-[11px] font-bold tracking-[0.14em] uppercase">
              {firstTime ? "Primeira vez aqui?" : "Como usar"} · {CHARACTERS[guide.who].name} explica
            </p>
            <p className="font-display text-lg leading-tight font-extrabold">{guide.title}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{guide.intro}</p>
        <ol className="grid gap-1.5 text-sm">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden className="bg-shu text-washi font-display grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold">
                {i + 1}
              </span>
              <span className="leading-snug">{s}</span>
            </li>
          ))}
        </ol>
        <Button size="sm" variant="outline" className="mt-1 justify-self-start" onClick={close}>
          Entendi
        </Button>
      </div>
      <button type="button" onClick={close} aria-label="Fechar o guia" className="hover:bg-accent absolute top-2 right-2 rounded-full p-1.5">
        <X aria-hidden className="size-4" />
      </button>
    </section>
  );
}

/** Tour de boas-vindas: só no primeiro acesso. Fecha com "Pular", Esc ou no fim. */
export function WelcomeTour() {
  const ctx = useTutorials();
  const [step, setStep] = useState(0);
  const [closed, setClosed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const show = !!ctx && !ctx.seen.has(WELCOME_KEY) && !closed;

  const finish = useCallback(() => {
    setClosed(true);
    ctx?.markSeen(WELCOME_KEY);
  }, [ctx]);

  useEffect(() => {
    if (!show) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [show, finish]);

  if (!show) return null;
  const s = WELCOME_STEPS[step];
  const last = step === WELCOME_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/45 p-3 sm:place-items-center">
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        data-testid="welcome-tour"
        className="bg-background animate-rise relative grid w-full max-w-md gap-4 overflow-hidden rounded-3xl border-2 border-ink p-5 shadow-[0_6px_0_var(--ink)] outline-none"
      >
        <div className="bg-ai seigaiha -mx-5 -mt-5 flex h-36 items-end justify-center gap-1 border-b-2 border-ink pt-4">
          {/* quem fala aparece na frente; os outros ficam menores */}
          {(["mochi", "daru", "fuku"] as const).map((who) => (
            <Character
              key={who === s.who ? `${who}-${step}` : who}
              pose={poseFor(who, who === s.who)}
              title=""
              className={cn("transition-all duration-300", who === s.who ? "animate-hop w-28 translate-y-3" : "w-14 translate-y-1 opacity-60")}
            />
          ))}
        </div>
        <div className="grid gap-2">
          <p className="text-shu text-[11px] font-bold tracking-[0.14em] uppercase">{CHARACTERS[s.who].name}</p>
          <h2 id="tour-title" className="text-2xl">
            {s.title}
          </h2>
          <p className="leading-relaxed">{s.text}</p>
        </div>
        <div className="flex items-center gap-1.5" aria-label={`Passo ${step + 1} de ${WELCOME_STEPS.length}`} role="img">
          {WELCOME_STEPS.map((_, i) => (
            <span key={i} className={cn("h-2 rounded-full border-[1.5px] border-ink transition-all", i === step ? "bg-shu w-6" : i < step ? "bg-ink w-2" : "w-2")} />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={finish} className="text-ink/60 hover:text-ink text-sm font-bold underline-offset-4 hover:underline">
            Pular
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
            {last ? (
              <Button asChild onClick={finish}>
                <Link href="/adicionar">Começar</Link>
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)}>Próximo</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Perfil: mostrar todos os tutoriais de novo. */
export function ResetTutorials() {
  const ctx = useTutorials();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await ctx?.resetAll();
            setState("done");
          } catch {
            setState("error");
          }
        }}
      >
        Ver os tutoriais de novo
      </Button>
      {state === "done" && <p role="status" className="text-matcha text-sm">Pronto! Os guias vão aparecer de novo em cada ferramenta.</p>}
      {state === "error" && <p role="alert" className="text-destructive text-sm">Não deu certo agora. Tente de novo.</p>}
    </div>
  );
}

"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { onSoundChange, play, setSoundEnabled, soundEnabled } from "@/lib/feedback/sound";
import { cn } from "@/lib/utils";

export function useSoundOn() {
  return useSyncExternalStore(onSoundChange, soundEnabled, () => true);
}

/** Liga/desliga os sons do app (fica guardado neste navegador). */
export function SoundToggle({ withLabel = false, className }: { withLabel?: boolean; className?: string }) {
  const on = useSoundOn();
  const Icon = on ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={withLabel ? undefined : on ? "Desligar sons" : "Ligar sons"}
      onClick={() => {
        setSoundEnabled(!on);
        if (!on) setTimeout(() => play("tap"), 0);
      }}
      className={cn(
        "tap-spring inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink/30 px-2.5 py-1.5 text-xs font-bold hover:border-ink",
        !on && "text-ink/50",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {withLabel && (on ? "Sons ligados" : "Sons desligados")}
    </button>
  );
}

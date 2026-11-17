"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Abas com uma "pílula" que desliza até a aba ativa (ideia do Fluid Tabs do Animata, MIT; sem bibliotecas).
 * Setas do teclado trocam de aba. Em telas estreitas a linha rola de lado sem empurrar a página.
 */
export function FluidTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, items.length]);

  const move = (dir: 1 | -1) => {
    const i = items.findIndex((x) => x.value === value);
    const next = items[(i + dir + items.length) % items.length];
    onChange(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <div className={cn("max-w-full overflow-x-auto [scrollbar-width:none]", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="bg-muted relative inline-flex rounded-full border-[1.5px] border-ink/70 p-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        {pill && (
          <span
            aria-hidden
            className="bg-primary absolute top-1 bottom-1 rounded-full border-2 border-ink shadow-[0_2px_0_var(--ink)] transition-[left,width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
            style={{ left: pill.left, width: pill.width }}
          />
        )}
        {items.map((it) => {
          const active = it.value === value;
          return (
            <button
              key={it.value}
              ref={(el) => {
                refs.current[it.value] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(it.value)}
              className={cn(
                "relative z-10 rounded-full px-4 py-1.5 text-sm font-bold whitespace-nowrap transition-colors",
                active ? "text-primary-foreground" : "text-ink/70 hover:text-ink",
                !pill && active && "bg-primary",
              )}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

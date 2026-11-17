"use client";

import {
  BookHeart,
  BookX,
  Camera,
  CircleUser,
  Coffee,
  Ellipsis,
  House,
  LibraryBig,
  type LucideIcon,
  MessagesSquare,
  NotebookPen,
  RotateCcw,
  Route,
  TrendingUp,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; short?: string };

/** Páginas agrupadas por para que servem (menu lateral e "Mais" do celular). */
export const NAV_GROUPS: { title: string; jp: string; jpMeaning: string; items: NavItem[] }[] = [
  {
    title: "Estudar",
    jp: "学ぶ",
    jpMeaning: "manabu, aprender",
    items: [
      { href: "/dashboard", label: "Início", icon: House },
      { href: "/espaco", label: "Espaço de estudos", icon: Coffee, short: "Foco" },
      { href: "/trilhas", label: "Trilhas", icon: Route },
      { href: "/review", label: "Revisar hoje", icon: RotateCcw, short: "Revisar" },
      { href: "/errors", label: "Caderno de erros", icon: BookX },
      { href: "/resolver", label: "Foto da questão", icon: Camera },
    ],
  },
  {
    title: "Organizar",
    jp: "整える",
    jpMeaning: "totonoeru, pôr em ordem",
    items: [
      { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
      { href: "/anotacoes", label: "Anotações", icon: NotebookPen },
      { href: "/diario", label: "Diário", icon: BookHeart },
    ],
  },
  {
    title: "Progresso",
    jp: "成長",
    jpMeaning: "seichō, crescer",
    items: [
      { href: "/desempenho", label: "Desempenho", icon: TrendingUp },
      { href: "/conquistas", label: "Conquistas", icon: Trophy },
    ],
  },
  {
    title: "Juntos",
    jp: "仲間",
    jpMeaning: "nakama, companheiros",
    items: [
      { href: "/salas", label: "Turmas", icon: Users },
      { href: "/comunidade", label: "Comunidade", icon: MessagesSquare },
      { href: "/perfil", label: "Perfil", icon: CircleUser },
    ],
  },
];

const ALL = NAV_GROUPS.flatMap((g) => g.items);
/** Barra de baixo no celular: as páginas do dia a dia; o resto fica no "Mais". */
const TABS = ["/dashboard", "/review", "/espaco", "/biblioteca"].map((h) => ALL.find((i) => i.href === h)!);

function isActive(path: string, href: string) {
  return (
    path === href ||
    path.startsWith(`${href}/`) ||
    (href === "/dashboard" && (path.startsWith("/subjects") || path.startsWith("/quiz") || path.startsWith("/materials") || path.startsWith("/chat"))) ||
    (href === "/salas" && path.startsWith("/rooms"))
  );
}

function NavItemLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-washi text-ink shadow-[0_2px_0_rgb(0_0_0/0.35)]" : "text-sidebar-foreground/80 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}

/** Menu lateral (computador): grupos com título. */
export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Menu" className="flex flex-col gap-5">
      {NAV_GROUPS.map((g) => (
        <div key={g.title} className="grid gap-0.5">
          <span className="flex items-baseline justify-between px-3 pb-1">
            <span className="text-sidebar-foreground/55 text-[11px] font-bold tracking-[0.16em] uppercase">{g.title}</span>
            <span className="font-display text-sidebar-foreground/35 text-xs" title={g.jpMeaning} lang="ja">
              {g.jp}
            </span>
          </span>
          {g.items.map((item) => (
            <NavItemLink key={item.href} item={item} active={isActive(path, item.href)} />
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Celular: barra fixa embaixo com 4 páginas + "Mais" (abre todas as páginas por grupo). */
export function BottomNav({ email, logout }: { email: string; logout: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const inMore = !TABS.some((t) => isActive(path, t.href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Todas as páginas">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="bg-sidebar text-sidebar-foreground seigaiha animate-rise absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-ink p-5 pb-24">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Todas as páginas</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="hover:bg-sidebar-accent/60 rounded-full p-2">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-5">
              {NAV_GROUPS.map((g) => (
                <div key={g.title} className="grid gap-1">
                  <span className="flex items-baseline gap-2 px-1">
                    <span className="text-sidebar-foreground/55 text-[11px] font-bold tracking-[0.16em] uppercase">{g.title}</span>
                    <span className="font-display text-sidebar-foreground/40 text-xs" lang="ja" title={g.jpMeaning}>
                      {g.jp}
                    </span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(path, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium", active ? "bg-washi text-ink" : "bg-white/6 ring-1 ring-white/10")}
                        >
                          <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
                <span className="truncate opacity-70">{email}</span>
                {logout}
              </div>
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label="Menu principal"
        className="bg-card fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t-2 border-ink px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(path, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-all",
                active ? "bg-primary text-primary-foreground border-2 border-ink px-4 shadow-[0_3px_0_var(--ink)]" : "text-ink/70 hover:bg-accent w-11",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.9} />
              <span className={active ? "" : "sr-only"}>{t.short ?? t.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-all",
            open || inMore ? "bg-primary text-primary-foreground border-2 border-ink px-4 shadow-[0_3px_0_var(--ink)]" : "text-ink/70 hover:bg-accent w-11",
          )}
        >
          <Ellipsis aria-hidden className="size-5 shrink-0" strokeWidth={1.9} />
          <span className={open || inMore ? "" : "sr-only"}>Mais</span>
        </button>
      </nav>
    </>
  );
}

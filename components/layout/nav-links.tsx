"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Início", icon: "⌂" },
  { href: "/espaco", label: "Espaço de estudos", icon: "☕" },
  { href: "/trilhas", label: "Trilhas", icon: "⛩" },
  { href: "/review", label: "Revisar hoje", icon: "↻" },
  { href: "/biblioteca", label: "Biblioteca", icon: "📚" },
  { href: "/anotacoes", label: "Anotações", icon: "📝" },
  { href: "/desempenho", label: "Desempenho", icon: "📈" },
  { href: "/diario", label: "Diário", icon: "📓" },
  { href: "/conquistas", label: "Conquistas", icon: "🏅" },
  { href: "/resolver", label: "Foto da questão", icon: "📷" },
  { href: "/errors", label: "Caderno de erros", icon: "✎" },
  { href: "/salas", label: "Turmas", icon: "👥" },
  { href: "/comunidade", label: "Comunidade", icon: "💬" },
  { href: "/perfil", label: "Perfil", icon: "☺" },
];

export function NavLinks({ className }: { className?: string }) {
  const path = usePathname();
  return (
    <nav className={cn("flex gap-1", className)}>
      {LINKS.map((l) => {
        const active =
          path === l.href ||
          path.startsWith(`${l.href}/`) ||
          (l.href === "/dashboard" && path.startsWith("/subjects")) ||
          (l.href === "/salas" && path.startsWith("/rooms"));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              active ? "bg-sidebar-accent text-white" : "hover:bg-sidebar-accent/60",
            )}
          >
            <span aria-hidden className="w-4 text-center">
              {l.icon}
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

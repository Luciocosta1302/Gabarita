import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/hanko";
import { BottomNav, SideNav } from "@/components/layout/nav-links";
import { TutorialProvider, WelcomeTour } from "@/components/tutorials/tutorials";
import { AvatarBadge } from "@/components/avatar/avatar";
import { levelOf } from "@/lib/achievements/badges";
import { parseAvatar } from "@/lib/avatar/avatar";
import { getUser } from "@/lib/supabase/server";

function HomeLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/dashboard" aria-label="Gabarita — página inicial">
      <Logo light={light} />
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="flex items-center gap-1.5 rounded-xl border border-current/25 px-3 py-1.5 text-xs hover:bg-black/10">
        <LogOut aria-hidden className="size-3.5" />
        Sair
      </button>
    </form>
  );
}

/** Sempre visível (menu lateral e topo do celular): o jeito mais rápido de mandar material. */
function AddMaterialButton({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/adicionar"
      data-testid={compact ? "add-material-mobile" : "add-material"}
      className={
        compact
          ? "stamp-press bg-primary text-primary-foreground flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
          : "stamp-press bg-primary text-primary-foreground flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold"
      }
    >
      <Plus aria-hidden className="size-4" strokeWidth={2.6} />
      {compact ? (
        <>
          Material<span className="sr-only"> (adicionar)</span>
        </>
      ) : (
        "Adicionar material"
      )}
    </Link>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("tutorials_seen, name, username, avatar_json, xp_cached").eq("id", user.id).maybeSingle();
  const avatar = parseAvatar(profile?.avatar_json);
  const level = levelOf(profile?.xp_cached ?? 0).level;

  return (
    <TutorialProvider initialSeen={profile?.tutorials_seen ?? []}>
    <div className="min-h-screen md:flex">
      {/* computador: menu lateral com grupos */}
      <aside className="bg-sidebar text-sidebar-foreground seigaiha hidden flex-col gap-6 border-r-2 border-ink p-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto">
        <div className="px-2 pt-1">
          <HomeLogo light />
        </div>
        <AddMaterialButton />
        <SideNav />
        <div className="mt-auto flex flex-col gap-3 px-1 text-xs">
          <Link href="/perfil" className="tap-spring flex items-center gap-2.5 rounded-2xl p-1.5 hover:bg-white/8" data-testid="me-chip">
            <AvatarBadge avatar={avatar} size={40} className="border-washi" />
            <span className="grid min-w-0">
              <span className="truncate text-sm font-bold">{profile?.name ?? "Você"}</span>
              <span className="truncate opacity-70">{profile?.username ? `@${profile.username}` : "Montar meu perfil"} · nív. {level}</span>
            </span>
          </Link>
          <div className="px-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* celular: barra fina em cima e menu embaixo, perto do polegar */}
      <header className="bg-background/95 sticky top-0 z-30 flex items-center justify-between border-b-2 border-ink px-4 py-2.5 backdrop-blur md:hidden">
        <HomeLogo />
        <div className="flex items-center gap-2">
          <AddMaterialButton compact />
          <Link href="/perfil" aria-label="Meu perfil" className="tap-spring">
            <AvatarBadge avatar={avatar} size={38} />
          </Link>
        </div>
      </header>
      <BottomNav email={user.email ?? ""} logout={<LogoutButton />} />

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-28 md:p-8">{children}</main>
      <WelcomeTour />
    </div>
    </TutorialProvider>
  );
}

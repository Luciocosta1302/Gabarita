import { GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { BottomNav, SideNav } from "@/components/layout/nav-links";
import { getUser } from "@/lib/supabase/server";

function Logo() {
  return (
    <Link href="/dashboard" className="font-display flex items-center gap-2 text-2xl font-bold text-[oklch(0.85_0.07_10)]">
      <GraduationCap aria-hidden className="size-7" strokeWidth={1.7} />
      Gabarita
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="hover:bg-sidebar-accent/60 flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs">
        <LogOut aria-hidden className="size-3.5" />
        Sair
      </button>
    </form>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      {/* computador: menu lateral com grupos */}
      <aside className="bg-sidebar text-sidebar-foreground hidden flex-col gap-6 p-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto">
        <div className="px-2 pt-1">
          <Logo />
        </div>
        <SideNav />
        <div className="mt-auto flex flex-col gap-2 px-2 text-xs">
          <span className="truncate opacity-70">{user.email}</span>
          <div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* celular: barra fina em cima e menu embaixo, perto do polegar */}
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 md:hidden">
        <Logo />
      </header>
      <BottomNav email={user.email ?? ""} logout={<LogoutButton />} />

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-28 md:p-8">{children}</main>
    </div>
  );
}

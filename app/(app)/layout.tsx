import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/layout/nav-links";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-sidebar text-sidebar-foreground flex flex-col gap-4 p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between gap-2 md:block">
          <Link href="/dashboard" className="font-display text-2xl font-bold text-[oklch(0.85_0.07_10)]">
            🎓 Gabarita
          </Link>
          <form action={logout} className="md:hidden">
            <button type="submit" className="text-sm underline">
              Sair
            </button>
          </form>
        </div>
        <NavLinks className="flex-row overflow-x-auto md:flex-col" />
        <div className="mt-auto hidden flex-col gap-2 text-xs md:flex">
          <span className="truncate opacity-70">{user.email}</span>
          <form action={logout}>
            <button type="submit" className="hover:bg-sidebar-accent/60 rounded-xl border border-white/15 px-3 py-1.5">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

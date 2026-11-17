import Link from "next/link";

import { Daruma } from "@/components/brand/daruma";
import { Hanko, Logo } from "@/components/brand/hanko";

/** Entrar/criar conta: no computador, a capa índigo do caderno ao lado; no celular, só o essencial. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1fr_1.1fr]">
      <aside className="bg-ai seigaiha text-washi relative hidden overflow-hidden border-r-2 border-ink p-10 md:flex md:flex-col md:justify-between">
        <Link href="/" aria-label="Gabarita, página inicial">
          <Logo light />
        </Link>
        <div className="relative grid gap-6">
          <Daruma mood="feliz" eyes="um" className="w-40" title="Daruma com um olho pintado" />
          <p className="font-display max-w-sm text-3xl leading-snug font-extrabold">
            Pinte um olho agora. O outro, no dia em que você passar.
          </p>
          <p className="text-washi/70 max-w-sm text-sm">
            Na tradição japonesa, o Daruma ganha um olho quando você define um objetivo e o outro quando o alcança.
          </p>
        </div>
        <Hanko text="合格" className="absolute right-10 bottom-10 size-20 opacity-90" rotate={-8} />
      </aside>
      <main className="flex flex-col items-center justify-center gap-6 p-5">
        <Link href="/" className="md:hidden" aria-label="Gabarita, página inicial">
          <Logo />
        </Link>
        {children}
      </main>
    </div>
  );
}

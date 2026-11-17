import Link from "next/link";

import { Logo } from "@/components/brand/hanko";

/** Páginas públicas de texto (privacidade, termos): leitura simples, sem precisar de conta. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/" aria-label="Gabarita, página inicial">
        <Logo />
      </Link>
      <article className="legal bg-card rounded-2xl border-2 border-ink/15 p-5 text-sm leading-relaxed sm:p-8">{children}</article>
      <nav className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <Link href="/privacidade" className="underline">Política de privacidade</Link>
        <Link href="/termos" className="underline">Termos de uso</Link>
        <Link href="/" className="underline">Página inicial</Link>
      </nav>
    </div>
  );
}

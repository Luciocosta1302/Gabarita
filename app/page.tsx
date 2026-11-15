import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Gabarita</h1>
      <p className="text-lg">
        Manda seu material e a data da prova. O Gabarita monta o plano, as questões e te avisa o que você ainda não
        sabe.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Criar conta</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}

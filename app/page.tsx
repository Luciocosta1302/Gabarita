import Link from "next/link";

import { Character, CHARACTERS, type CharacterPose } from "@/components/brand/character";
import { Daruma } from "@/components/brand/daruma";
import { Mochi } from "@/components/brand/mochi";
import { Hanko, Logo } from "@/components/brand/hanko";

const TURMA: { pose: CharacterPose }[] = [
  { pose: { who: "mochi", mood: "feliz" } },
  { pose: { who: "daru", mood: "feliz", eyes: "um" } },
  { pose: { who: "fuku", mood: "explicando" } },
];

const STEPS = [
  {
    n: "01",
    jp: "集",
    jpMeaning: "atsumeru, reunir",
    title: "Mande o material",
    text: "PDF, foto do caderno, aula gravada ou um vídeo do YouTube. O Gabarita lê tudo e separa por assunto.",
  },
  {
    n: "02",
    jp: "道",
    jpMeaning: "michi, caminho",
    title: "Siga o plano até a prova",
    text: "Com a data da prova, você ganha o que estudar em cada dia, questões com a página de onde saíram e revisão na hora certa.",
  },
  {
    n: "03",
    jp: "合格",
    jpMeaning: "gōkaku, passar na prova",
    title: "Colecione os selos",
    text: "Cada dia estudado ganha um carimbo no seu caderno. O Daruma pinta um olho agora e o outro quando você passar.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/login" className="text-sm font-bold underline-offset-4 hover:underline">
          Entrar
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-5 pt-6 pb-20">
        {/* abertura */}
        <section className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div className="grid gap-6">
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-10 bg-ink/40" aria-hidden />
              <span className="font-display text-shu text-sm tracking-normal" lang="ja">
                合格
              </span>
              gōkaku · passar na prova
            </p>
            <h1 className="text-5xl leading-[1.05] md:text-7xl">
              Seu caderno de selos até o dia da prova.
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              Manda o material e a data da prova. O Gabarita monta o plano, as questões com a página de onde saíram e te avisa o
              que você ainda não sabe.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="stamp-press bg-primary text-primary-foreground rounded-2xl px-7 py-3.5 text-base font-bold">
                Criar conta grátis
              </Link>
              <Link href="/login" className="stamp-press bg-card rounded-2xl px-7 py-3.5 text-base font-bold">
                Já tenho conta
              </Link>
            </div>
          </div>

          {/* o Daruma com um olho (objetivo definido) sobre a capa do caderno */}
          <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-xs md:max-w-sm">
            <div className="bg-ai seigaiha aspect-[3/4] rotate-3 rounded-r-3xl rounded-l-lg border-2 border-ink shadow-[6px_8px_0_var(--ink)]">
              <div className="bg-washi absolute top-6 left-8 rounded-sm border-[1.5px] border-ink px-3 py-2 shadow-[0_2px_0_rgb(0_0_0/0.25)]">
                <p className="font-display text-lg leading-tight font-extrabold">Caderno de selos</p>
                <p className="text-[10px] font-bold tracking-widest text-ink/60 uppercase">ENEM · Cebraspe · Faculdade</p>
              </div>
              <span aria-hidden className="absolute inset-y-0 left-0 w-3 rounded-l-lg border-r-2 border-ink/60 bg-black/25" />
            </div>
            <Daruma mood="animado" eyes="um" className="absolute -bottom-6 -left-8 w-28 sm:w-36 md:w-44" title="Daruma com um olho pintado: o objetivo foi definido" />
            <Mochi mood="animada" className="absolute -right-6 bottom-10 w-24 sm:w-28 md:w-32" title="Mochi, a gatinha do Gabarita, acenando" />
            <Hanko className="absolute top-6 -right-3 size-16" rotate={12} />
            <Hanko text="合格" className="absolute right-10 -bottom-4 size-14" rotate={-8} />
          </div>
        </section>

        {/* como funciona: páginas numeradas */}
        <section className="grid gap-6">
          <p className="eyebrow">Como funciona</p>
          <ol className="grid gap-0 border-t-[1.5px] border-ink md:grid-cols-3 md:gap-8 md:border-t-0">
            {STEPS.map((s) => (
              <li key={s.n} className="grid gap-3 border-b-[1.5px] border-ink/25 py-6 md:border-t-[1.5px] md:border-b-0 md:border-ink">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-shu text-sm font-extrabold">{s.n}</span>
                  <span className="font-display text-ink/25 text-3xl" lang="ja" title={s.jpMeaning}>
                    {s.jp}
                  </span>
                </div>
                <h2 className="text-2xl">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* a turma: três personagens, cada um com um papel */}
        <section className="grid gap-6" aria-labelledby="turma">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow" id="turma">Conheça a turma</p>
            <span className="font-display text-ink/25 text-3xl" lang="ja" title="nakama, companheiros">
              仲間
            </span>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {TURMA.map((c) => (
              <li key={c.pose.who} className="bg-card grid grid-cols-[5.5rem_1fr] items-start gap-4 rounded-2xl border-2 border-ink p-4 shadow-[0_4px_0_var(--ink)]">
                <Character pose={c.pose} className="w-full" />
                <div className="grid gap-1">
                  <h2 className="text-2xl">{CHARACTERS[c.pose.who].name}</h2>
                  <p className="text-shu text-xs font-bold tracking-[0.14em] uppercase">{CHARACTERS[c.pose.who].kind}</p>
                  <p className="text-sm leading-relaxed">{CHARACTERS[c.pose.who].personality}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{CHARACTERS[c.pose.who].role}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t-[1.5px] border-ink/20 py-6 text-center text-xs text-ink/50">
        Gabarita · estudo com plano, fonte e revisão
      </footer>
    </div>
  );
}

import { cn } from "@/lib/utils";

import { Daruma, type DarumaMood } from "./daruma";
import { Fuku, type FukuMood } from "./fuku";
import { Mochi, type MochiMood } from "./mochi";

/**
 * A turma do Gabarita: três personagens, cada um com um papel nos estudos.
 * - Mochi (gatinha tricolor): recebe, comemora e faz companhia no foco.
 * - Daru (daruma): persistência — sequência, plano, prova chegando, levantar depois do erro.
 * - Fuku (coruja professora): explica, tira dúvidas e mostra onde está no material.
 */
export type CharacterPose =
  | { who: "mochi"; mood: MochiMood }
  | { who: "daru"; mood: DarumaMood; eyes?: "um" | "dois" }
  | { who: "fuku"; mood: FukuMood };

export const CHARACTERS = {
  mochi: {
    name: "Mochi",
    kind: "gatinha tricolor",
    personality: "Fofa e animada. Fala pouco, comemora muito e acena com a patinha como a maneki-neko.",
    role: "Te recebe, comemora cada acerto e faz companhia enquanto você foca.",
  },
  daru: {
    name: "Daru",
    kind: "daruma",
    personality: "Teimoso no bom sentido. Lema: 七転び八起き — cai sete vezes, levanta oito.",
    role: "Cuida da sua sequência, do plano até a prova e te levanta depois de um dia ruim.",
  },
  fuku: {
    name: "Fuku",
    kind: "coruja professora",
    personality: "Calma e paciente. Fukurō soa como 不苦労, “sem sofrimento” — estudar sem sofrer.",
    role: "Explica a matéria, tira dúvidas e sempre mostra a página do material.",
  },
} as const;

export function Character({ pose, className, title }: { pose: CharacterPose; className?: string; title?: string }) {
  const label = title ?? `${CHARACTERS[pose.who].name}, ${CHARACTERS[pose.who].kind}`;
  if (pose.who === "mochi") return <Mochi mood={pose.mood} className={className} title={label} />;
  if (pose.who === "fuku") return <Fuku mood={pose.mood} className={className} title={label} />;
  return <Daruma mood={pose.mood} eyes={pose.eyes} className={className} title={label} />;
}

/** Avatar redondo pequeno (mensagens do tutor/chat). */
export function CharacterAvatar({ pose, className }: { pose: CharacterPose; className?: string }) {
  return (
    <span className={cn("bg-card grid size-10 shrink-0 place-items-end overflow-hidden rounded-full border-2 border-ink", className)}>
      <Character pose={pose} className="w-9 translate-y-1" title="" />
    </span>
  );
}

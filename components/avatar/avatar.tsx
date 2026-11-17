import { Daruma } from "@/components/brand/daruma";
import { Fuku } from "@/components/brand/fuku";
import { Mochi } from "@/components/brand/mochi";
import { type Avatar, bgOf, colorOf } from "@/lib/avatar/avatar";
import { cn } from "@/lib/utils";

import { HeadItem, NeckItem } from "./outfits";

/** O personagem do aluno, com cor e roupas (sem fundo). */
export function AvatarFigure({ avatar, className, title = "" }: { avatar: Avatar; className?: string; title?: string }) {
  const c = colorOf(avatar);
  const outfit = (
    <>
      <NeckItem who={avatar.who} item={avatar.neck} />
      <HeadItem who={avatar.who} item={avatar.head} />
    </>
  );
  if (avatar.who === "mochi") {
    return (
      <Mochi mood="feliz" className={className} title={title} colors={"fur" in c ? c : undefined}>
        {outfit}
      </Mochi>
    );
  }
  if (avatar.who === "fuku") {
    return (
      <Fuku mood="feliz" className={className} title={title} colors={"feather" in c ? c : undefined}>
        {outfit}
      </Fuku>
    );
  }
  return (
    <Daruma mood="feliz" eyes="dois" className={className} title={title} colors={"mid" in c ? c : undefined} plainBelly={avatar.neck !== "nada"}>
      {outfit}
    </Daruma>
  );
}

/** Avatar redondo (menu, comunidade, ranking, perfil). */
export function AvatarBadge({ avatar, size = 40, className, label }: { avatar: Avatar; size?: number; className?: string; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("grid shrink-0 place-items-end overflow-hidden rounded-full border-2 border-ink", className)}
      style={{ width: size, height: size, background: bgOf(avatar) }}
    >
      <AvatarFigure avatar={avatar} className="w-[88%] translate-y-[6%]" />
    </span>
  );
}

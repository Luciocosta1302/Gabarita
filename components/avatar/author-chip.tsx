import Link from "next/link";

import { DEFAULT_AVATAR } from "@/lib/avatar/avatar";
import type { PublicProfile } from "@/lib/profile/load";
import { cn } from "@/lib/utils";

import { AvatarBadge } from "./avatar";

/** Avatar + nome (e @, que leva ao perfil público) de um aluno. */
export function AuthorChip({ profile, fallbackName, size = 24, className, link = true }: { profile?: PublicProfile; fallbackName: string; size?: number; className?: string; link?: boolean }) {
  const body = (
    <>
      <AvatarBadge avatar={profile?.avatar ?? DEFAULT_AVATAR} size={size} className="border-[1.5px]" />
      <span className="truncate font-medium">{profile?.name ?? fallbackName}</span>
      {profile && <span className="text-muted-foreground shrink-0 text-[11px]">nív. {profile.level}</span>}
    </>
  );
  const cls = cn("inline-flex min-w-0 items-center gap-1.5 align-middle", className);
  return link && profile?.username ? (
    <Link href={`/u/${profile.username}`} className={cn(cls, "hover:underline")}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

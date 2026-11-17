import Link from "next/link";
import { notFound } from "next/navigation";

import { ModerationActions } from "@/components/moderation/moderation-actions";
import { isModerator, loadQueue } from "@/lib/moderation/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

const REASONS: Record<string, string> = { ofensivo: "ofensivo", spam: "spam", golpe: "golpe", dados_pessoais: "dados pessoais", outro: "outro" };

/** Painel da moderação: o que foi denunciado na Comunidade. Só para ADMIN_EMAILS (os outros veem 404). */
export default async function ModerationPage() {
  const { user } = await getUser();
  if (!user || !isModerator(user.email)) notFound();
  const items = await loadQueue(createAdminClient());
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Moderação</h1>
        <p className="text-muted-foreground text-sm">
          Posts e respostas denunciados na Comunidade. Com 3 denúncias o item já some para os outros alunos; aqui você decide se
          ele volta ou é apagado.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground" data-testid="mod-empty">Nenhuma denúncia. Tudo em paz.</p>
      ) : (
        <ul className="grid gap-3" data-testid="mod-queue">
          {items.map((it) => (
            <li key={`${it.kind}:${it.id}`} className="bg-card grid gap-2 rounded-2xl border-2 border-ink/15 p-4" data-testid="mod-item">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border px-2 py-0.5 font-bold">{it.kind === "post" ? "Post" : "Resposta"}</span>
                {it.hidden && <span className="bg-destructive rounded-full px-2 py-0.5 font-bold text-white">escondido</span>}
                <span>
                  {it.reports} {it.reports === 1 ? "denúncia" : "denúncias"}:{" "}
                  {Object.entries(it.reasons)
                    .map(([r, n]) => `${REASONS[r] ?? r} (${n})`)
                    .join(", ")}
                </span>
                <span className="text-muted-foreground ml-auto">
                  {it.author_name} · {new Date(it.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
              </div>
              {it.title && <p className="font-bold">{it.title}</p>}
              <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{it.body}</p>
              <Link href={`/comunidade/${it.post_id}`} className="text-primary w-fit text-xs underline">
                Abrir na Comunidade
              </Link>
              <ModerationActions kind={it.kind} id={it.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FeynmanForm } from "@/components/feynman/feynman-form";
import { ProGate } from "@/components/billing/pro-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPlan } from "@/lib/billing/limits";
import { createClient } from "@/lib/supabase/server";

export default async function FeynmanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const pro = (await loadPlan(supabase, auth.user!.id)).pro;
  const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", id).maybeSingle();
  if (!subject) notFound();
  const [{ data: topics }, { data: sessions }] = await Promise.all([
    supabase.from("topics").select("id, name").eq("subject_id", id).order("position"),
    supabase
      .from("feynman_sessions")
      .select("id, score, mode, created_at, topics(name)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-muted-foreground text-sm hover:underline">
        ← {subject.name}
      </Link>
      <div className="from-pastel-rose to-pastel-peach animate-rise rounded-3xl bg-gradient-to-br p-6">
        <h1 className="text-3xl font-bold">Modo Feynman</h1>
        <p className="text-sm">
          Se você consegue explicar de um jeito simples, você entendeu. Explique o conceito por escrito ou falando; o
          Gabarita compara com o seu material e mostra o que acertou, o que faltou e o que está errado.
        </p>
      </div>
      {pro ? (
        <Card>
          <CardContent className="pt-6">
            <FeynmanForm topics={topics ?? []} />
          </CardContent>
        </Card>
      ) : (
        <ProGate feature="feynman">Explique os conceitos por texto ou voz e descubra exatamente o que faltou entender.</ProGate>
      )}
      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suas explicações</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm" data-testid="feynman-history">
              {sessions.map((s) => (
                <li key={s.id} className="flex justify-between gap-2 rounded-xl border p-3">
                  <span>
                    {s.topics?.name ?? "Tópico"} <span className="text-muted-foreground text-xs">· {s.mode === "audio" ? "🎙 falando" : "✍ escrito"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{s.score ?? "—"}</strong>/100 · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

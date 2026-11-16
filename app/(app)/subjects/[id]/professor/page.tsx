import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MaterialList } from "@/components/materials/material-list";
import { UploadForm } from "@/components/materials/upload-form";
import { TeacherQuizButton } from "@/components/teacher/teacher-quiz-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeacherProfile } from "@/lib/ai/prompts/teacher";
import { createClient } from "@/lib/supabase/server";
import type { LikelyTopic } from "@/lib/teacher/logic";

const TYPE_LABELS: Record<string, string> = {
  multipla_escolha: "Múltipla escolha",
  certo_errado: "Certo ou errado",
  discursiva: "Discursiva",
  calculo: "Cálculo",
  outro: "Outro",
};
const LENGTH_LABELS = {
  curto: "curtos",
  medio: "médios",
  longo: "longos",
} as const;

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!subject) notFound();
  const [{ data: exams }, { data: tp }] = await Promise.all([
    supabase
      .from("materials")
      .select("id, title, type, status, page_count, error")
      .eq("subject_id", id)
      .eq("type", "past_exam")
      .order("created_at", { ascending: false }),
    supabase
      .from("teacher_profiles")
      .select("style_json, likely_topics_json, exams_count, updated_at")
      .eq("subject_id", id)
      .maybeSingle(),
  ]);
  const profile = tp?.style_json as TeacherProfile | undefined;
  const likely = (tp?.likely_topics_json ?? []) as LikelyTopic[];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/subjects/${id}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {subject.name}
      </Link>
      <div className="from-pastel-mint to-pastel-lilac animate-rise rounded-3xl bg-gradient-to-br p-6">
        <h1 className="text-3xl font-bold">Prova do Professor</h1>
        <p className="text-sm">
          Mande provas antigas deste professor (ou da banca). O Gabarita aprende
          o estilo dele — tipo de questão, tamanho do enunciado, pegadinhas — e
          mostra os tópicos com mais chance de cair. Depois, gere questões
          iguais às dele.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provas antigas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <UploadForm subjectId={id} purpose="past_exam" />
          <MaterialList materials={exams ?? []} />
        </CardContent>
      </Card>

      {profile ? (
        <>
          <Card data-testid="teacher-profile">
            <CardHeader>
              <CardTitle>O estilo do professor</CardTitle>
              <p className="text-muted-foreground text-xs">
                Baseado em {tp!.exams_count}{" "}
                {tp!.exams_count === 1 ? "prova" : "provas"}
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="text-base">{profile.summary}</p>
              <div className="grid gap-2">
                {profile.question_types.map((t) => (
                  <div key={t.type} className="grid gap-1">
                    <span className="flex justify-between">
                      {TYPE_LABELS[t.type] ?? t.type}{" "}
                      <span>{Math.round(t.share)}%</span>
                    </span>
                    <span className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <span
                        className="bg-primary block h-full"
                        style={{ width: `${t.share}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
              <p>
                Enunciados {LENGTH_LABELS[profile.stem_length]}
                {profile.options_count
                  ? ` · ${profile.options_count} alternativas`
                  : ""}
              </p>
              {profile.traps.length > 0 && (
                <div className="bg-pastel-rose/60 rounded-xl p-3">
                  <span className="font-semibold">Pegadinhas que ele usa</span>
                  <ul className="list-disc pl-5">
                    {profile.traps.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {profile.style_notes.length > 0 && (
                <ul className="list-disc pl-5">
                  {profile.style_notes.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
              {profile.example_stems.length > 0 && (
                <div className="grid gap-1">
                  <span className="font-semibold">Exemplos de enunciado</span>
                  {profile.example_stems.map((e, i) => (
                    <blockquote
                      key={i}
                      className="border-primary/40 border-l-2 pl-3 italic"
                    >
                      {e}
                    </blockquote>
                  ))}
                </div>
              )}
              <TeacherQuizButton
                subjectId={id}
                label="Gerar 10 questões no estilo do professor"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tópicos com mais chance de cair</CardTitle>
            </CardHeader>
            <CardContent>
              {likely.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {profile.likely_topics.length
                    ? `As provas cobram: ${profile.likely_topics.map((l) => l.name).join(", ")}. Envie o material da matéria para ligar esses assuntos aos seus tópicos.`
                    : "Ainda não deu para identificar os assuntos mais cobrados."}
                </p>
              ) : (
                <ol className="grid gap-2" data-testid="likely-topics">
                  {likely.map((l) => (
                    <li
                      key={l.topicId}
                      className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
                    >
                      <span>
                        <span className="font-semibold">{l.name}</span>{" "}
                        <span
                          aria-label={`chance ${l.weight} de 5`}
                          className="text-primary"
                        >
                          {"★".repeat(l.weight)}
                          <span className="text-muted-foreground">
                            {"★".repeat(5 - l.weight)}
                          </span>
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {l.reason}
                        </span>
                      </span>
                      <TeacherQuizButton
                        subjectId={id}
                        topicId={l.topicId}
                        count={5}
                        label="Praticar no estilo"
                        variant="outline"
                      />
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-muted-foreground mt-3 text-xs">
                Esses tópicos também ganham mais tempo no seu plano até a prova.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          O perfil aparece aqui depois que a primeira prova for analisada.
        </p>
      )}
    </div>
  );
}

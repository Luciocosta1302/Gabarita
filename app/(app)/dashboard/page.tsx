import Link from "next/link";

import { CreateSubjectForm } from "@/components/subjects/create-subject-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { EXAM_STYLE_LABELS } from "@/lib/exam-styles";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("name").maybeSingle();
  const firstName = profile?.name?.split(" ")[0];
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_date, exam_style")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <section className="animate-rise from-pastel-rose via-pastel-peach to-pastel-lilac rounded-3xl bg-gradient-to-br p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-bold">{firstName ? `Olá, ${firstName}!` : "Olá!"}</h1>
        <p className="font-display text-xl">Vamos estudar hoje?</p>
        <p className="text-foreground/75 mt-2 max-w-md text-sm">
          Mande seu material, gere questões com fonte e descubra o que você ainda não sabe.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Nova matéria</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSubjectForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Suas matérias</h2>
        {!subjects?.length ? (
          <p className="text-muted-foreground text-sm">Nenhuma matéria ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="subject-list">
            {subjects.map((s) => (
              <li key={s.id}>
                <Link href={`/subjects/${s.id}`} className="bg-card hover:bg-accent block rounded-xl border p-3 transition-colors">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground block text-sm">
                    {EXAM_STYLE_LABELS[s.exam_style as keyof typeof EXAM_STYLE_LABELS] ?? s.exam_style}
                    {s.exam_date && ` · prova em ${formatDate(s.exam_date)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

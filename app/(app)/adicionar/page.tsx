import { MascotSays } from "@/components/brand/mascot-says";
import { UploadForm } from "@/components/materials/upload-form";
import { CreateSubjectForm } from "@/components/subjects/create-subject-form";
import { ToolGuide } from "@/components/tutorials/tutorials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

/** Adicionar material de qualquer lugar: escolhe a matéria, o formato e manda. */
export default async function AddMaterialPage({ searchParams }: { searchParams: Promise<{ materia?: string; modo?: string }> }) {
  const { materia, modo } = await searchParams;
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("created_at", { ascending: false });
  const list = subjects ?? [];
  // a matéria pedida no link vem primeiro (fica selecionada)
  const ordered = materia ? [...list.filter((s) => s.id === materia), ...list.filter((s) => s.id !== materia)] : list;
  const initialMode = modo === "link" || modo === "text" ? modo : "files";

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise">
        <p className="eyebrow flex items-center gap-2">
          <span className="font-display text-shu text-sm tracking-normal" lang="ja" title="atsumeru, juntar">
            集
          </span>
          Material de estudo
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl">Adicionar material</h1>
      </div>

      <ToolGuide id="adicionar" />

      {list.length === 0 ? (
        <>
          <MascotSays pose={{ who: "mochi", mood: "animada" }}>
            Primeiro, crie a matéria (o caderno) onde o material vai ficar. Leva 10 segundos!
          </MascotSays>
          <Card>
            <CardHeader>
              <CardTitle>1. Crie a matéria</CardTitle>
              <p className="text-muted-foreground text-sm">Com a data da prova, você ganha um plano de estudo diário.</p>
            </CardHeader>
            <CardContent>
              <CreateSubjectForm />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <UploadForm subjects={ordered} initialMode={initialMode} goToSubject />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

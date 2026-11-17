import { MascotSays } from "@/components/brand/mascot-says";
import { UploadForm } from "@/components/materials/upload-form";
import { ToolGuide } from "@/components/tutorials/tutorials";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

/**
 * Adicionar um arquivo: manda e já abre uma conversa com ele (como um chat novo).
 * Pasta é opcional: sem escolher, vai para "Sem pasta" e dá para mover depois.
 */
export default async function AddMaterialPage({ searchParams }: { searchParams: Promise<{ materia?: string; modo?: string }> }) {
  const { materia, modo } = await searchParams;
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").eq("inbox", false).order("created_at", { ascending: false });
  const folders = subjects ?? [];
  const initialFolder = folders.some((f) => f.id === materia) ? materia : undefined;
  const initialMode = modo === "link" || modo === "text" ? modo : "files";

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-rise">
        <p className="eyebrow flex items-center gap-2">
          <span className="font-display text-shu text-sm tracking-normal" lang="ja" title="atsumeru, juntar">
            集
          </span>
          Nova conversa
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl">Adicionar material</h1>
      </div>

      <ToolGuide id="adicionar" />

      <MascotSays pose={{ who: "fuku", mood: "explicando" }} size="sm">
        Mande o arquivo e eu leio pra você. Cada arquivo vira uma conversa: pergunte o que quiser, peça resumo ou questões.
      </MascotSays>

      <Card>
        <CardContent className="pt-6">
          <UploadForm folders={folders} subjectId={initialFolder} initialMode={initialMode} openChat />
        </CardContent>
      </Card>
    </div>
  );
}

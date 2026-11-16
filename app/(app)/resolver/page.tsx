import { SolvePhoto } from "@/components/solve/solve-photo";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Foto da questão — Gabarita" };

export default async function SolvePage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("created_at", { ascending: false });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Foto da questão</h1>
        <p className="text-muted-foreground text-sm">
          Tire foto de qualquer questão: o Gabarita resolve passo a passo e mostra onde essa matéria está no seu material.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SolvePhoto subjects={subjects ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

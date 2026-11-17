import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api/route";
import { createFolder, ensureInbox } from "@/lib/folders/folders";

const schema = z.union([
  z.object({ inbox: z.literal(true) }),
  z.object({ name: z.string().trim().min(1, "Escreva o nome da pasta").max(120, "Nome muito longo") }),
]);

/** Pasta para guardar um arquivo: uma nova (pelo nome) ou a "Sem pasta". */
export const POST = apiRoute(schema, async (input, { supabase, user }) => {
  const id = "inbox" in input ? await ensureInbox(supabase, user.id) : await createFolder(supabase, user.id, input.name);
  return NextResponse.json({ subject_id: id }, { status: 201 });
});

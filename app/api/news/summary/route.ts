import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { summarizeNews } from "@/lib/news/service";

/** Resumo da notícia pela IA (guardado depois da primeira vez). */
export const POST = apiRoute(
  z.object({ id: z.uuid() }),
  async ({ id }, { supabase }) => {
    try {
      return NextResponse.json(await summarizeNews(supabase, id));
    } catch (e) {
      if ((e as { status?: number }).status === 404) return jsonError("Notícia não encontrada. Recarregue a página.", 404);
      throw e;
    }
  },
  { ai: true },
);

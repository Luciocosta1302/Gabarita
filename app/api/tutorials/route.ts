import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute } from "@/lib/api/route";
import { GUIDES, WELCOME_KEY } from "@/lib/tutorials/guides";

const KEYS = [WELCOME_KEY, ...Object.keys(GUIDES)] as [string, ...string[]];

const schema = z.union([
  z.object({ key: z.enum(KEYS), seen: z.boolean().default(true) }),
  /** "Ver os tutoriais de novo" (Perfil) */
  z.object({ key: z.literal("*"), seen: z.literal(false) }),
]);

/** Marca um tutorial como visto (ou desmarca todos). */
export const POST = apiRoute(schema, async (input, { supabase }) => {
  const { data, error } = await supabase.rpc("set_tutorial_seen", { p_key: input.key, p_seen: input.seen });
  if (error) throw error;
  return NextResponse.json({ seen: data ?? [] });
});

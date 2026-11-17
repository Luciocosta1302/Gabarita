import { NextResponse } from "next/server";
import { z } from "zod";

import { apiRoute, jsonError } from "@/lib/api/route";
import { isModerator, moderate } from "@/lib/moderation/moderation";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ kind: z.enum(["post", "comment"]), id: z.uuid(), action: z.enum(["restore", "delete"]) });

/** Moderação da Comunidade: só para os e-mails em ADMIN_EMAILS. */
export const POST = apiRoute(schema, async (input, { user }) => {
  if (!isModerator(user.email)) return jsonError("Só a moderação pode fazer isso.", 403);
  await moderate(createAdminClient(), input);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteAccount } from "@/lib/account/delete";
import { isDemoAccount } from "@/lib/account/demo";
import { apiRoute, jsonError } from "@/lib/api/route";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ confirm: z.literal("APAGAR", "Digite APAGAR para confirmar") });

/** Apaga a conta do aluno logado, com todos os dados e arquivos. Não tem volta. */
export const POST = apiRoute(schema, async (_input, { supabase, user }) => {
  // a conta de demonstração (login público no README) não pode ser apagada por quem está testando
  if (isDemoAccount(user.email)) return jsonError("Esta é a conta de demonstração: ela não pode ser apagada. Crie a sua conta para testar isso.", 403);
  await deleteAccount(createAdminClient(), user.id);
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
});

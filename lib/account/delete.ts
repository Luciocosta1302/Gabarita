import "server-only";

import { MATERIALS_BUCKET } from "@/lib/ingest/pipeline";
import type { AdminClient } from "@/lib/supabase/admin";

/**
 * Apaga a conta de vez (LGPD): primeiro os arquivos do Storage (que não somem em cascata), depois o
 * usuário — todas as tabelas do app apagam em cascata a partir de auth.users.
 */
export async function deleteAccount(admin: AdminClient, userId: string) {
  const bucket = admin.storage.from(MATERIALS_BUCKET);
  const root = userId;
  const { data: entries, error } = await bucket.list(root, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const e of entries ?? []) {
    if (e.id) {
      paths.push(`${root}/${e.name}`); // arquivo solto
      continue;
    }
    const { data: files, error: e2 } = await bucket.list(`${root}/${e.name}`, { limit: 1000 });
    if (e2) throw e2;
    for (const f of files ?? []) paths.push(`${root}/${e.name}/${f.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error: e3 } = await bucket.remove(paths.slice(i, i + 100));
    if (e3) throw e3;
  }
  const { error: e4 } = await admin.auth.admin.deleteUser(userId);
  if (e4) throw e4;
  return { files: paths.length };
}

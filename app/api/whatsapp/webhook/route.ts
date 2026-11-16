import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMetaSignature } from "@/lib/whatsapp/client";
import { normalizePhone } from "@/lib/whatsapp/format";
import { handleIncoming } from "@/lib/whatsapp/service";

export const maxDuration = 60;

/** Verificação do webhook pela Meta (hub.challenge). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ok =
    url.searchParams.get("hub.mode") === "subscribe" &&
    !!process.env.WHATSAPP_VERIFY_TOKEN &&
    url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("forbidden", { status: 403 });
}

type MetaPayload = {
  entry?: { changes?: { value?: { messages?: { from: string; id: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } }[] } }[] }[];
};

/** Mensagens recebidas. Valida a assinatura da Meta (em produção é obrigatória). */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "WHATSAPP_APP_SECRET não configurado." }, { status: 503 });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(raw) as MetaPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const admin = createAdminClient();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
        const phone = normalizePhone(m.from);
        if (!phone || !text) continue;
        try {
          await handleIncoming(admin, { phone, text, providerId: m.id });
        } catch (e) {
          console.error("[whatsapp] falha ao processar mensagem", e);
        }
      }
    }
  }
  // a Meta reenvia se não receber 200
  return NextResponse.json({ ok: true });
}

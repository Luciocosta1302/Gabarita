import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { AdminClient } from "@/lib/supabase/admin";

/**
 * WhatsApp Cloud API (Meta). Sem WHATSAPP_TOKEN as mensagens só são registradas em `whatsapp_messages`
 * (modo de teste) — dá para ver a conversa na tela do Perfil.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured() {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function post(body: unknown) {
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { messages?: { id: string }[] };
  return json.messages?.[0]?.id ?? null;
}

async function log(admin: AdminClient, userId: string | null, phone: string, body: string, providerId: string | null) {
  await admin.from("whatsapp_messages").insert({ user_id: userId, direction: "out", phone, body, provider_id: providerId });
}

/** Texto livre (só dentro da janela de 24 h depois da última mensagem do aluno). */
export async function sendText(admin: AdminClient, input: { userId: string | null; phone: string; body: string }) {
  const id = whatsappConfigured()
    ? await post({ messaging_product: "whatsapp", to: input.phone, type: "text", text: { body: input.body, preview_url: false } })
    : null;
  await log(admin, input.userId, input.phone, input.body, id);
}

/**
 * Convite diário: mensagem iniciada pela empresa precisa de template aprovado (WHATSAPP_TEMPLATE_DAILY,
 * com 1 parâmetro = primeiro nome). Sem template configurado, manda texto (funciona no modo de teste).
 */
export async function sendInvite(admin: AdminClient, input: { userId: string; phone: string; name: string | null; fallbackText: string }) {
  const template = process.env.WHATSAPP_TEMPLATE_DAILY;
  let id: string | null = null;
  if (whatsappConfigured()) {
    id = template
      ? await post({
          messaging_product: "whatsapp",
          to: input.phone,
          type: "template",
          template: {
            name: template,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR" },
            components: [{ type: "body", parameters: [{ type: "text", text: input.name?.split(" ")[0] ?? "estudante" }] }],
          },
        })
      : await post({ messaging_product: "whatsapp", to: input.phone, type: "text", text: { body: input.fallbackText } });
  }
  await log(admin, input.userId, input.phone, input.fallbackText, id);
}

/** Valida X-Hub-Signature-256 ("sha256=<hmac do corpo cru com o App Secret>"). */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.slice(7));
  return a.length === b.length && timingSafeEqual(a, b);
}

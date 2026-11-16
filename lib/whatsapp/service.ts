import "server-only";

import { isPro } from "@/lib/billing/plan";
import { addDays, todayBR } from "@/lib/dates";
import { indexToLetter, letterToIndex } from "@/lib/quiz/options";
import { QUESTION_FIELDS, recordAttempt } from "@/lib/quiz/record";
import type { AdminClient } from "@/lib/supabase/admin";

import { sendInvite, sendText } from "./client";
import { feedbackText, formatQuestion, INVITE_TEXT, parseReply, summaryText } from "./format";

export const DAILY_COUNT = 5;

/** 5 questões objetivas: primeiro as da revisão espaçada que venceram, depois as que ainda não acertou. */
export async function pickDailyQuestions(admin: AdminClient, userId: string, n = DAILY_COUNT) {
  const { data: due } = await admin
    .from("reviews")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_type", "question")
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(n);
  const ids = (due ?? []).map((r) => r.item_id);
  if (ids.length < n) {
    const { data: recentRight } = await admin
      .from("attempts")
      .select("question_id")
      .eq("user_id", userId)
      .eq("correct", true)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
    const skip = new Set([...ids, ...(recentRight ?? []).map((a) => a.question_id)]);
    const { data: pool } = await admin
      .from("questions")
      .select("id")
      .eq("user_id", userId)
      .in("type", ["multiple_choice", "true_false"])
      .not("options_json", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    const candidates = (pool ?? []).map((q) => q.id).filter((id) => !skip.has(id));
    // embaralha para não repetir sempre as mais novas
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    ids.push(...candidates.slice(0, n - ids.length));
  }
  // só objetivas (revisões podem apontar para discursivas antigas)
  if (!ids.length) return [];
  const { data: ok } = await admin.from("questions").select("id").in("id", ids).not("options_json", "is", null);
  const valid = new Set((ok ?? []).map((q) => q.id));
  return ids.filter((id) => valid.has(id));
}

/** Cria a sessão do dia (se ainda não existe) e manda o convite. */
export async function startDailySession(admin: AdminClient, userId: string, { force = false } = {}) {
  const day = todayBR();
  const { data: profile } = await admin.from("profiles").select("name, whatsapp_phone").eq("id", userId).single();
  if (!profile?.whatsapp_phone) return null;
  const { data: existing } = await admin.from("whatsapp_sessions").select("id").eq("user_id", userId).eq("day", day).maybeSingle();
  if (existing && !force) return null;
  if (existing) await admin.from("whatsapp_sessions").delete().eq("id", existing.id);

  const questionIds = await pickDailyQuestions(admin, userId);
  if (!questionIds.length) return null;
  const { data: session, error } = await admin
    .from("whatsapp_sessions")
    .insert({ user_id: userId, day, question_ids: questionIds, status: "invited" })
    .select("id")
    .single();
  if (error || !session) throw error ?? new Error("Falha ao criar a sessão do WhatsApp");
  await sendInvite(admin, { userId, phone: profile.whatsapp_phone, name: profile.name, fallbackText: INVITE_TEXT(profile.name) });
  return session.id;
}

async function sendQuestion(admin: AdminClient, userId: string, phone: string, questionIds: string[], index: number) {
  const { data: q } = await admin.from("questions").select("stem, options_json").eq("id", questionIds[index]).single();
  await sendText(admin, { userId, phone, body: formatQuestion({ index, total: questionIds.length, stem: q!.stem, options: (q!.options_json as string[]) ?? [] }) });
}

/** Mensagem recebida (webhook): começar, responder com a letra ou parar. */
export async function handleIncoming(admin: AdminClient, input: { phone: string; text: string; providerId?: string | null }) {
  const { data: profile } = await admin.from("profiles").select("id, plan, pro_until").eq("whatsapp_phone", input.phone).maybeSingle();
  await admin.from("whatsapp_messages").insert({ user_id: profile?.id ?? null, direction: "in", phone: input.phone, body: input.text.slice(0, 2000), provider_id: input.providerId ?? null });
  if (!profile) {
    await sendText(admin, { userId: null, phone: input.phone, body: "Não encontrei esse número no Gabarita. Cadastre-o em Perfil, no app." });
    return;
  }
  const userId = profile.id;
  const reply = parseReply(input.text);

  if (reply.kind === "stop") {
    await admin.from("profiles").update({ whatsapp_opt_in: false }).eq("id", userId);
    await sendText(admin, { userId, phone: input.phone, body: "Pronto, você não vai mais receber as questões diárias. Para voltar, ative em Perfil no app." });
    return;
  }
  if (!isPro(profile)) {
    await sendText(admin, { userId, phone: input.phone, body: "As questões no WhatsApp são do plano Pro. Veja em Planos, no app." });
    return;
  }

  const { data: session } = await admin
    .from("whatsapp_sessions")
    .select("id, question_ids, current, correct, status")
    .eq("user_id", userId)
    .in("status", ["invited", "active"])
    .gte("day", addDays(todayBR(), -1))
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!session) {
    await sendText(admin, { userId, phone: input.phone, body: "Sem questões abertas agora. Amanhã chegam mais! 📚" });
    return;
  }

  if (session.status === "invited") {
    await admin.from("whatsapp_sessions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", session.id);
    await sendQuestion(admin, userId, input.phone, session.question_ids, session.current);
    return;
  }
  if (reply.kind !== "answer") {
    await sendText(admin, { userId, phone: input.phone, body: "Responda só com a letra da alternativa (ex.: B). Para parar, mande PARAR." });
    return;
  }

  const qid = session.question_ids[session.current];
  const { data: q } = await admin.from("questions").select(`${QUESTION_FIELDS}, options_json`).eq("id", qid).single();
  const options = (q!.options_json as string[]) ?? [];
  if (letterToIndex(reply.letter) >= options.length) {
    await sendText(admin, { userId, phone: input.phone, body: `Essa questão vai até a letra ${indexToLetter(options.length - 1)}. Tente de novo.` });
    return;
  }
  const { result } = await recordAttempt(admin, userId, q!, { questionId: qid, answer: reply.letter, confidence: null });
  await sendText(admin, {
    userId,
    phone: input.phone,
    body: feedbackText({ correct: result.correct, answerLetter: result.answer, answerText: options[letterToIndex(result.answer)] ?? "", explanation: result.explanation }),
  });

  const current = session.current + 1;
  const correct = session.correct + (result.correct ? 1 : 0);
  const done = current >= session.question_ids.length;
  await admin
    .from("whatsapp_sessions")
    .update({ current, correct, status: done ? "done" : "active", updated_at: new Date().toISOString() })
    .eq("id", session.id);
  if (done) await sendText(admin, { userId, phone: input.phone, body: summaryText(correct, session.question_ids.length) });
  else await sendQuestion(admin, userId, input.phone, session.question_ids, current);
}

/** Cron de hora em hora: convida quem é Pro, ativou o WhatsApp e escolheu esta hora (fuso de São Paulo). */
export async function runDaily(admin: AdminClient, hourBR: number) {
  const { data: users } = await admin
    .from("profiles")
    .select("id, plan, pro_until")
    .eq("whatsapp_opt_in", true)
    .eq("whatsapp_hour", hourBR)
    .not("whatsapp_phone", "is", null);
  let sent = 0;
  for (const u of users ?? []) {
    if (!isPro(u)) continue;
    try {
      if (await startDailySession(admin, u.id)) sent++;
    } catch (e) {
      console.error("[whatsapp] falha ao convidar", u.id, e);
    }
  }
  return sent;
}

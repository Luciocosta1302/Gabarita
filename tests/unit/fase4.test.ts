import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { mapStatus, verifyWebhookSignature } from "@/lib/billing/mercadopago";
import { extendPro, formatBRL, isPro } from "@/lib/billing/plan";
import { verifyMetaSignature } from "@/lib/whatsapp/client";
import { feedbackText, formatQuestion, normalizePhone, parseReply, summaryText } from "@/lib/whatsapp/format";

describe("planos", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  it("Pro vale até a data; sem data = Pro concedido sem validade", () => {
    expect(isPro({ plan: "pro", pro_until: "2026-12-01T00:00:00Z" }, now)).toBe(true);
    expect(isPro({ plan: "pro", pro_until: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(isPro({ plan: "pro", pro_until: null }, now)).toBe(true);
    expect(isPro({ plan: "free", pro_until: "2027-01-01T00:00:00Z" }, now)).toBe(false);
    expect(isPro(null, now)).toBe(false);
  });
  it("pagar soma 30 dias ao vencimento atual (ou a partir de hoje, se já venceu)", () => {
    expect(extendPro("2026-11-25T12:00:00.000Z", now)).toBe("2026-12-25T12:00:00.000Z");
    expect(extendPro("2026-10-01T00:00:00.000Z", now)).toBe("2026-12-18T12:00:00.000Z");
    expect(extendPro(null, now)).toBe("2026-12-18T12:00:00.000Z");
  });
  it("preço em reais", () => {
    expect(formatBRL(1990).replace(/\s/g, " ")).toBe("R$ 19,90");
  });
});

describe("Mercado Pago", () => {
  const secret = "segredo-de-teste";
  const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

  it("aceita assinatura válida e recusa adulterada", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
    expect(verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "123456", secret })).toBe(true);
    expect(verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "999", secret })).toBe(false);
    expect(verifyWebhookSignature({ signature: `ts=1700000001,v1=${v1}`, requestId: "req-1", dataId: "123456", secret })).toBe(false);
    expect(verifyWebhookSignature({ signature: null, requestId: null, dataId: "1", secret })).toBe(false);
  });
  it("id alfanumérico vai em minúsculas no texto assinado", () => {
    const v1 = sign("id:abc123;request-id:r;ts:1;");
    expect(verifyWebhookSignature({ signature: `ts=1,v1=${v1}`, requestId: "r", dataId: "ABC123", secret })).toBe(true);
  });
  it("status do MP → nosso status", () => {
    expect(mapStatus("approved")).toBe("approved");
    expect(mapStatus("in_process")).toBe("pending");
    expect(mapStatus("charged_back")).toBe("refunded");
  });
});

describe("WhatsApp", () => {
  it("normaliza celular brasileiro", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("+55 11 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("123")).toBeNull();
  });
  it("entende a resposta do aluno", () => {
    expect(parseReply("b")).toEqual({ kind: "answer", letter: "B" });
    expect(parseReply(" Letra C ")).toEqual({ kind: "answer", letter: "C" });
    expect(parseReply("a)")).toEqual({ kind: "answer", letter: "A" });
    expect(parseReply("Começar")).toEqual({ kind: "start" });
    expect(parseReply("PARAR")).toEqual({ kind: "stop" });
    expect(parseReply("acho que é a b")).toEqual({ kind: "unknown" });
  });
  it("monta a questão e o retorno", () => {
    const t = formatQuestion({ index: 0, total: 5, stem: "Onde?", options: ["Aqui", "Ali"] });
    expect(t).toContain("Questão 1/5");
    expect(t).toContain("B) Ali");
    expect(t).toContain("(A, B)");
    expect(feedbackText({ correct: false, answerLetter: "A", answerText: "Aqui", explanation: "x".repeat(500) }).length).toBeLessThan(500);
    expect(summaryText(5, 5)).toContain("5 de 5");
  });
  it("assinatura da Meta", () => {
    const body = '{"a":1}';
    const sig = `sha256=${createHmac("sha256", "app").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, sig, "app")).toBe(true);
    expect(verifyMetaSignature(body + " ", sig, "app")).toBe(false);
    expect(verifyMetaSignature(body, null, "app")).toBe(false);
  });
});

import { recommendations, weeklySeries, weekStartOf } from "@/lib/performance/stats";

describe("desempenho", () => {
  it("semana começa na segunda", () => {
    expect(weekStartOf("2026-11-19")).toBe("2026-11-16"); // quinta → segunda
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16");
    expect(weekStartOf("2026-11-22")).toBe("2026-11-16"); // domingo
  });
  it("série das últimas semanas com aproveitamento", () => {
    const s = weeklySeries(
      [
        { correct: true, created_at: "2026-11-18T15:00:00Z", confidence: null },
        { correct: false, created_at: "2026-11-17T15:00:00Z", confidence: null },
        { correct: true, created_at: "2026-11-10T15:00:00Z", confidence: null },
        { correct: true, created_at: "2025-01-01T15:00:00Z", confidence: null },
      ],
      "2026-11-19",
      3,
    );
    expect(s.map((w) => w.weekStart)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(s.map((w) => [w.answered, w.accuracy])).toEqual([[0, null], [1, 1], [2, 0.5]]);
  });
  it("recomendações priorizam revisão, plano e tópicos fracos", () => {
    const r = recommendations({ weakTopics: [{ name: "Mitose", subjectId: "s", mastery: 0.2 }], dueReviews: 3, pendingToday: 2, sureWrongRate: 0.4, sureTotal: 10, answered: 50 });
    expect(r.map((x) => x.kind)).toEqual(["review", "plan", "weak", "certainty"]);
    expect(recommendations({ weakTopics: [], dueReviews: 0, pendingToday: 0, sureWrongRate: null, sureTotal: 0, answered: 0 })[0].kind).toBe("start");
  });
});

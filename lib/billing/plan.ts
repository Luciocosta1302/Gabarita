/** Planos (Fase 4). Funções puras, sem dependências (servidor e navegador). */

export const PRO_PRICE_CENTS = 1990;
export const PRO_PERIOD_DAYS = 30;
export const FREE_LIMITS = { materialsPerMonth: 2, questionsPerDay: 30 } as const;

export type ProFeature = "professor" | "feynman" | "whatsapp";
export const PRO_FEATURE_LABELS: Record<ProFeature, string> = {
  professor: "Prova do Professor",
  feynman: "Modo Feynman",
  whatsapp: "5 questões por dia no WhatsApp",
};

/** Pro vale enquanto `pro_until` não passou (Pro sem data = concedido manualmente, sem validade). */
export function isPro(p: { plan: string; pro_until: string | null } | null | undefined, now = new Date()) {
  if (!p || p.plan !== "pro") return false;
  return !p.pro_until || Date.parse(p.pro_until) > now.getTime();
}

/** Novo vencimento ao pagar: soma os dias a partir do vencimento atual (se ainda vale) ou de agora. */
export function extendPro(currentUntil: string | null, now: Date, days = PRO_PERIOD_DAYS) {
  const base = currentUntil && Date.parse(currentUntil) > now.getTime() ? new Date(currentUntil) : now;
  return new Date(base.getTime() + days * 86_400_000).toISOString();
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** WhatsApp (D15) — textos e leitura das respostas. Funções puras. */

/** Normaliza para o formato internacional só com dígitos (ex.: 5511987654321). Celular BR sem DDI ganha 55. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if (d.length >= 12 && d.length <= 15) return d;
  return null;
}

export function formatQuestion(input: { index: number; total: number; stem: string; options: string[] }) {
  const letters = "ABCDE";
  const opts = input.options.map((o, i) => `${letters[i]}) ${o}`).join("\n");
  return `📚 Questão ${input.index + 1}/${input.total}\n\n${input.stem}\n\n${opts}\n\nResponda só com a letra (${letters.slice(0, input.options.length).split("").join(", ")}).`;
}

export type Reply = { kind: "answer"; letter: string } | { kind: "start" } | { kind: "stop" } | { kind: "unknown" };

export function parseReply(text: string): Reply {
  const t = text
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (/^(PARAR|SAIR|STOP|CANCELAR)\b/.test(t)) return { kind: "stop" };
  const letter = t.match(/^(?:LETRA\s+|ALTERNATIVA\s+)?([A-E])\s*[).]?\s*$/);
  if (letter) return { kind: "answer", letter: letter[1] };
  if (/^(COMECAR|SIM|BORA|OK|VAMOS|QUERO|INICIAR)\b/.test(t)) return { kind: "start" };
  return { kind: "unknown" };
}

export function feedbackText(input: { correct: boolean; answerLetter: string; answerText: string; explanation: string | null }) {
  const head = input.correct ? "✅ Acertou!" : `❌ Não foi dessa vez. Resposta: ${input.answerLetter}) ${input.answerText}`;
  const exp = input.explanation ? `\n\n${input.explanation.length > 400 ? `${input.explanation.slice(0, 397)}...` : input.explanation}` : "";
  return `${head}${exp}`;
}

export function summaryText(correct: number, total: number) {
  const emoji = correct === total ? "🏆" : correct >= total / 2 ? "🌸" : "💪";
  return `${emoji} Fim das questões de hoje: ${correct} de ${total}.\nOs erros foram para o seu caderno de erros e voltam na revisão. Até amanhã!`;
}

export const INVITE_TEXT = (name: string | null) =>
  `Bom dia${name ? `, ${name.split(" ")[0]}` : ""}! ☀️ Suas 5 questões do Gabarita chegaram. Responda COMEÇAR para receber a primeira. (PARAR para não receber mais)`;

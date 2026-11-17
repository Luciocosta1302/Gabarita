import "server-only";

import { generateJSON } from "@/lib/ai/provider";
import { answerCheckPrompt, type CheckItem } from "@/lib/ai/prompts/answer-check";

const PER_CALL = 10;

export type CheckableQuestion = { stem: string; options: string[]; answerIndex: number; source: string };

/**
 * Confere o gabarito resolvendo "às cegas": devolve, para cada questão, se a IA revisora chegou à
 * mesma alternativa usando só o trecho do material. Discursivas (sem alternativas) passam direto.
 * Se a revisão falhar (IA fora do ar), nada passa — melhor menos questões do que gabarito errado.
 */
export async function checkAnswers(questions: CheckableQuestion[]): Promise<boolean[]> {
  const result = questions.map((q) => q.options.length === 0);
  const toCheck = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.options.length > 0);
  for (let start = 0; start < toCheck.length; start += PER_CALL) {
    const batch = toCheck.slice(start, start + PER_CALL);
    const items: CheckItem[] = batch.map(({ q }, k) => ({ n: k + 1, stem: q.stem, options: q.options, source: q.source.slice(0, 4000) }));
    try {
      const { data } = await generateJSON(answerCheckPrompt(items));
      const byN = new Map(data.answers.map((a) => [a.n, a.choice]));
      batch.forEach(({ q, i }, k) => {
        result[i] = byN.get(k + 1) === q.answerIndex;
      });
    } catch (e) {
      // IA sobrecarregada/sem cota: avisa o aluno para tentar de novo, em vez de "não deu para conferir"
      if (e instanceof Error && (e as { rateLimited?: boolean }).rateLimited) throw e;
      console.error("[gabarito] revisão falhou:", e instanceof Error ? e.message : e);
    }
  }
  return result;
}

/** Aplica a conferência numa lista e devolve só as que passaram, com a contagem de descartadas. */
export async function keepChecked<T extends CheckableQuestion>(questions: T[]): Promise<{ kept: T[]; dropped: number }> {
  const ok = await checkAnswers(questions);
  const kept = questions.filter((_, i) => ok[i]);
  if (kept.length < questions.length) console.info(`[gabarito] ${questions.length - kept.length} de ${questions.length} questões descartadas na conferência`);
  return { kept, dropped: questions.length - kept.length };
}

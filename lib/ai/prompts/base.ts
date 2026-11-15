/**
 * Regra comum a todos os prompts. Cada tarefa terá seu arquivo em lib/ai/prompts/
 * com o prompt e o schema Zod correspondente (a partir da Fase 1).
 */
export const GROUNDING_RULE =
  "Use apenas o material fornecido. Se o material não tiver base para responder, diga explicitamente que não há base no material. Nunca invente fatos, números ou citações.";

export function withGrounding(system: string) {
  return `${system}\n\n${GROUNDING_RULE}`;
}

/** Estilos de prova/banca (D5). Sem dependências para poder ir ao navegador. */
export const EXAM_STYLES = ["livre", "enem", "cebraspe", "fgv", "fcc", "vunesp", "discursiva"] as const;
export type ExamStyle = (typeof EXAM_STYLES)[number];

export const EXAM_STYLE_LABELS: Record<ExamStyle, string> = {
  livre: "Livre (faculdade)",
  enem: "ENEM",
  cebraspe: "Cebraspe (certo/errado)",
  fgv: "FGV",
  fcc: "FCC",
  vunesp: "Vunesp",
  discursiva: "Discursiva",
};

export type StyleSpec = {
  format: "multiple_choice" | "true_false" | "open";
  options: number;
  /** instruções de estilo para a IA */
  guide: string;
  /** minutos por questão no simulado */
  minutesPerQuestion: number;
};

export const STYLE_SPECS: Record<ExamStyle, StyleSpec> = {
  livre: {
    format: "multiple_choice",
    options: 4,
    guide: "Questões objetivas de faculdade: enunciado direto e alternativas plausíveis.",
    minutesPerQuestion: 2,
  },
  enem: {
    format: "multiple_choice",
    options: 5,
    guide:
      "Estilo ENEM: enunciado contextualizado com uma situação-problema ou texto-base curto (2 a 4 frases) ligado ao cotidiano, seguido de um comando claro. Cinco alternativas homogêneas. Avalia interpretação e aplicação do conceito, não decoreba.",
    minutesPerQuestion: 3,
  },
  cebraspe: {
    format: "true_false",
    options: 2,
    guide:
      "Estilo Cebraspe: cada item é uma afirmação para o candidato julgar CERTO ou ERRADO. Itens errados têm um erro sutil (troca de termo, generalização indevida, inversão de causa e efeito, exceção ignorada), nunca absurdo. Mais ou menos metade dos itens certos.",
    minutesPerQuestion: 1.5,
  },
  fgv: {
    format: "multiple_choice",
    options: 5,
    guide:
      "Estilo FGV: enunciados mais longos e interpretativos, muitas vezes um caso concreto. Alternativas extensas e parecidas entre si, que exigem atenção a detalhes, exceções e palavras como 'sempre', 'somente', 'exceto'.",
    minutesPerQuestion: 3,
  },
  fcc: {
    format: "multiple_choice",
    options: 5,
    guide:
      "Estilo FCC: enunciado curto e direto ('É correto afirmar que...', 'Considere as afirmativas...'). Cobra a letra do conteúdo com precisão de termos e definições.",
    minutesPerQuestion: 2.5,
  },
  vunesp: {
    format: "multiple_choice",
    options: 5,
    guide:
      "Estilo Vunesp: enunciado objetivo de tamanho médio e alternativas curtas. Cobra conceitos e aplicação simples.",
    minutesPerQuestion: 2.5,
  },
  // D10: questões abertas, corrigidas com rubrica (conteúdo, clareza, termos).
  discursiva: {
    format: "open",
    options: 0,
    guide: "Questões discursivas: pedem explicação, comparação ou justificativa em um parágrafo.",
    minutesPerQuestion: 8,
  },
};

/** Estilos que o aluno pode escolher ao gerar questões. */
export const SELECTABLE_STYLES = EXAM_STYLES;
/** O simulado é corrigido de uma vez, então fica só com objetivas. */
export const SIMULADO_STYLES = EXAM_STYLES.filter((s): s is Exclude<ExamStyle, "discursiva"> => s !== "discursiva");

export function isTrueFalse(options: unknown): boolean {
  return Array.isArray(options) && options.length === 2 && options[0] === "Certo" && options[1] === "Errado";
}

/** Estilo padrão para os formulários: o da matéria, se puder ser escolhido; senão "livre". */
export function selectableStyle(style: string | null | undefined): ExamStyle {
  return (EXAM_STYLES as readonly string[]).includes(style ?? "") ? (style as ExamStyle) : "livre";
}

export function simuladoStyle(style: string | null | undefined): (typeof SIMULADO_STYLES)[number] {
  return (SIMULADO_STYLES as readonly string[]).includes(style ?? "") ? (style as (typeof SIMULADO_STYLES)[number]) : "livre";
}

/** Estilos de prova/banca (D5). Sem dependências para poder ir ao navegador. */
export const EXAM_STYLES = ["livre", "enem", "cebraspe", "fgv", "fcc", "vunesp", "discursiva"] as const;

export const EXAM_STYLE_LABELS: Record<(typeof EXAM_STYLES)[number], string> = {
  livre: "Livre (faculdade)",
  enem: "ENEM",
  cebraspe: "Cebraspe (certo/errado)",
  fgv: "FGV",
  fcc: "FCC",
  vunesp: "Vunesp",
  discursiva: "Discursiva",
};

export type ExamStyle = (typeof EXAM_STYLES)[number];

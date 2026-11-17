/**
 * Notícias sobre estudos: objetivos, fontes (RSS públicos de jornais e órgãos oficiais), estados e etiquetas.
 * Regras puras (testadas). Mostramos título, trecho e link do original; o resumo é feito pela IA.
 */

export const STUDY_GOALS = [
  { id: "vestibular", label: "Vestibular / ENEM", hint: "SISU, ProUni, FIES, provas" },
  { id: "concurso", label: "Concursos", hint: "editais, inscrições, provas" },
  { id: "faculdade", label: "Faculdade", hint: "graduação, bolsas, pós" },
  { id: "pessoal", label: "Estudos pessoais", hint: "aprender por conta própria" },
  { id: "outro", label: "Outro", hint: "um pouco de tudo" },
] as const;
export type StudyGoal = (typeof STUDY_GOALS)[number]["id"];

export type NewsSource = { id: string; name: string; url: string; about: string; goals: StudyGoal[] };

/** Fontes do catálogo (feeds RSS públicos). Uma fonte fora do ar aparece como indisponível, sem quebrar a página. */
export const NEWS_SOURCES: NewsSource[] = [
  { id: "g1-educacao", name: "g1 Educação", url: "https://g1.globo.com/rss/g1/educacao/", about: "ENEM, vestibulares e escolas", goals: ["vestibular", "faculdade", "pessoal", "outro"] },
  { id: "g1-concursos", name: "g1 Concursos e Emprego", url: "https://g1.globo.com/rss/g1/concursos-e-emprego/", about: "Editais e concursos", goals: ["concurso", "outro"] },
  { id: "agencia-brasil-educacao", name: "Agência Brasil — Educação", url: "https://agenciabrasil.ebc.com.br/rss/educacao/feed.xml", about: "Agência pública de notícias", goals: ["vestibular", "faculdade", "concurso", "outro"] },
  { id: "folha-educacao", name: "Folha — Educação", url: "https://feeds.folha.uol.com.br/educacao/rss091.xml", about: "Reportagens sobre educação", goals: ["vestibular", "faculdade", "pessoal", "outro"] },
  { id: "mec", name: "Ministério da Educação (MEC)", url: "https://www.gov.br/mec/pt-br/assuntos/noticias/RSS", about: "Avisos oficiais: SISU, ProUni, FIES", goals: ["vestibular", "faculdade"] },
  { id: "inep", name: "Inep", url: "https://www.gov.br/inep/pt-br/assuntos/noticias/RSS", about: "ENEM, Encceja, Enade (oficial)", goals: ["vestibular", "faculdade"] },
  { id: "porvir", name: "Porvir", url: "https://porvir.org/feed/", about: "Inovação e aprendizagem", goals: ["pessoal", "faculdade"] },
];

export const STATES: [string, string][] = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
];

/** Fontes sugeridas para cada objetivo (o aluno pode marcar e desmarcar). */
export function suggestedSources(goal: StudyGoal | null): string[] {
  return NEWS_SOURCES.filter((s) => !goal || s.goals.includes(goal)).map((s) => s.id);
}

/** Notícias da região: busca do Google Notícias (RSS público) por educação/concursos no estado ou cidade. */
export function localFeed(state: string, city: string | null, goal: StudyGoal | null) {
  const place = city?.trim() ? `"${city.trim()}"` : `"${STATES.find(([uf]) => uf === state)?.[1] ?? state}"`;
  const topic = goal === "concurso" ? "(concurso OR edital)" : goal === "pessoal" ? "(educação OR curso)" : "(educação OR vestibular OR ENEM OR universidade)";
  const q = encodeURIComponent(`${topic} ${place}`);
  return {
    key: `local:${state}:${(city ?? "").trim().toLowerCase().slice(0, 40)}`,
    name: city?.trim() ? `Notícias de ${city.trim()}` : `Notícias de ${STATES.find(([uf]) => uf === state)?.[1] ?? state}`,
    url: `https://news.google.com/rss/search?q=${q}+when:30d&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
  };
}

export function customFeedKey(url: string) {
  // chave estável e curta para um feed colado pelo aluno
  let h = 5381;
  for (const ch of url) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `custom:${h.toString(36)}`;
}

/** Etiquetas automáticas (viram #hashtags para filtrar). Ordem = prioridade. */
export const TAGS: { tag: string; re: RegExp }[] = [
  { tag: "enem", re: /\benem\b/i },
  { tag: "sisu", re: /\bsisu\b/i },
  { tag: "prouni", re: /\bprouni\b/i },
  { tag: "fies", re: /\bfies\b/i },
  { tag: "vestibular", re: /\bvestibula(r|res)\b|fuvest|unicamp|comvest|vunesp/i },
  { tag: "concurso", re: /\bconcurso|concurseir/i },
  { tag: "edital", re: /\bedita(l|is)\b/i },
  { tag: "inscricoes", re: /\binscri[çc](ão|ões|oes|ao)\b|\binscrev/i },
  { tag: "resultado", re: /\bresultado|aprovad|classifica[çc]/i },
  { tag: "gabarito", re: /\bgabarito/i },
  { tag: "universidade", re: /\buniversidade|\bfaculdade|ensino superior|graduação|\buf[a-z]{1,3}\b|\busp\b/i },
  { tag: "bolsa", re: /\bbolsa(s)?\b|\bpé-de-meia\b/i },
  { tag: "escola", re: /\bescola|ensino médio|ensino fundamental|educação básica/i },
  { tag: "pos", re: /mestrado|doutorado|pós-gradua/i },
  { tag: "redacao", re: /\breda[çc][ãa]o\b/i },
  { tag: "tecnologia", re: /intelig[êe]ncia artificial|\bIA\b|tecnologia|\bdigital\b/i },
];

export function tagsFor(text: string): string[] {
  return TAGS.filter((t) => t.re.test(text))
    .map((t) => t.tag)
    .slice(0, 5);
}

export const TAG_LABELS: Record<string, string> = {
  enem: "ENEM", sisu: "SISU", prouni: "ProUni", fies: "FIES", vestibular: "Vestibular", concurso: "Concurso", edital: "Edital",
  inscricoes: "Inscrições", resultado: "Resultado", gabarito: "Gabarito", universidade: "Universidade", bolsa: "Bolsas", escola: "Escola",
  pos: "Pós-graduação", redacao: "Redação", tecnologia: "Tecnologia",
};

export const PERIODS = [
  { id: "hoje", label: "Hoje", days: 1 },
  { id: "semana", label: "Semana", days: 7 },
  { id: "mes", label: "Mês", days: 31 },
  { id: "tudo", label: "Tudo", days: null },
] as const;
export type Period = (typeof PERIODS)[number]["id"];

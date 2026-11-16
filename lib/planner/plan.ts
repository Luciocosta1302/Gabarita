/**
 * D2 — Plano reverso até a prova. Funções puras (sem IA, sem banco):
 * - buildPlan: monta os dias de hoje até a véspera da prova.
 * - markMissed / autoReplan: dia não feito → as tarefas pendentes vão para os próximos dias.
 */
import { addDays, daysBetween } from "@/lib/dates";

export type TaskKind = "upload" | "study" | "questions" | "revisit" | "review" | "weak" | "simulado";

export type PlanTask = {
  id: string;
  kind: TaskKind;
  title: string;
  minutes: number;
  topic_id?: string | null;
  /** nº de questões (questions/revisit/simulado) */
  count?: number;
  done?: boolean;
  /** veio de um dia não feito */
  moved_from?: string;
};

export type DayStatus = "pending" | "done" | "missed";
export type PlanDay = { date: string; status: DayStatus; tasks: PlanTask[] };
export type PlanTopic = { id: string; name: string; weight: number; mastery: number | null };

export type PlanInput = {
  today: string;
  examDate: string;
  minutesPerDay: number;
  /** em ordem do material; vazio = ainda não há material */
  topics: PlanTopic[];
};

const MIN_STUDY = 15;
const MAX_STUDY_BLOCK = 60;
const QUESTIONS_PER_TOPIC = 10;
const MINUTES_PER_QUESTION = 1.5;
/** dias depois de aprender um tópico em que ele volta (curva do esquecimento) */
const REVISIT_OFFSETS = [2, 6];

function dailyReviewMinutes(minutesPerDay: number) {
  return minutesPerDay >= 90 ? 15 : 10;
}

/** Tarefas que não mudam de dia: a revisão diária (FSRS) é sempre "do dia". */
function isMovable(t: PlanTask) {
  return t.kind !== "review";
}

export function buildPlan(input: PlanInput): PlanDay[] {
  const n = daysBetween(input.today, input.examDate);
  if (n <= 0) return [];
  const cap = Math.max(30, Math.round(input.minutesPerDay));
  const days: PlanDay[] = Array.from({ length: n }, (_, i) => ({
    date: addDays(input.today, i),
    status: "pending",
    tasks: [],
  }));
  let seq = 0;
  const id = (kind: TaskKind, extra = "") => `${kind}-${extra ? `${extra}-` : ""}${++seq}`;
  const load = (d: PlanDay) => d.tasks.reduce((s, t) => s + t.minutes, 0);

  // Revisão diária (cartões e questões que vencem no dia)
  const rev = dailyReviewMinutes(cap);
  for (const d of days) d.tasks.push({ id: id("review"), kind: "review", title: "Revisar hoje (cartões e erros)", minutes: rev });

  // Reta final: penúltimo dia revisa os tópicos fracos, último dia faz simulado.
  const finalDays = n >= 4 ? 2 : n >= 2 ? 1 : 0;
  const learnDays = days.slice(0, n - finalDays);
  if (finalDays >= 1) {
    const last = days[n - 1];
    const simCount = Math.max(10, Math.min(60, Math.floor((cap - rev) / 3)));
    last.tasks.push({
      id: id("simulado"),
      kind: "simulado",
      title: `Simulado cronometrado (${simCount} questões)`,
      minutes: Math.min(cap - rev, simCount * 3),
      count: simCount,
    });
  }
  if (finalDays === 2) {
    const weak = [...input.topics]
      .sort((a, b) => (a.mastery ?? 0.5) - (b.mastery ?? 0.5))
      .slice(0, 3)
      .map((t) => t.name);
    days[n - 2].tasks.push({
      id: id("weak"),
      kind: "weak",
      title: weak.length ? `Revisar pontos fracos: ${weak.join(", ")}` : "Revisar os pontos fracos e o caderno de erros",
      minutes: cap - rev,
    });
  }
  if (learnDays.length === 0) {
    // 1 dia só: revisão + questões gerais
    days[0].tasks.push({ id: id("questions"), kind: "questions", title: "Fazer 10 questões de tudo", minutes: 15, count: 10 });
    return days;
  }

  // Sem material ainda: plano genérico, refeito quando os tópicos aparecerem.
  if (input.topics.length === 0) {
    learnDays[0].tasks.push({ id: id("upload"), kind: "upload", title: "Enviar o material da prova", minutes: 10 });
    for (const d of learnDays) {
      const free = cap - load(d);
      const q = Math.max(5, Math.min(20, Math.floor((free * 0.4) / MINUTES_PER_QUESTION)));
      d.tasks.push({ id: id("study"), kind: "study", title: "Estudar o material", minutes: Math.max(MIN_STUDY, free - Math.round(q * MINUTES_PER_QUESTION)) });
      d.tasks.push({ id: id("questions"), kind: "questions", title: `Fazer ${q} questões`, minutes: Math.round(q * MINUTES_PER_QUESTION), count: q });
    }
    return days;
  }

  // Com tópicos: tempo de estudo proporcional ao tamanho e ao quanto falta dominar.
  const qMinutes = Math.round(QUESTIONS_PER_TOPIC * MINUTES_PER_QUESTION);
  const available = learnDays.reduce((s, d) => s + (cap - load(d)), 0) - input.topics.length * qMinutes;
  const need = input.topics.map((t) => Math.max(0.05, t.weight * (1 - 0.8 * (t.mastery ?? 0))));
  const needSum = need.reduce((a, b) => a + b, 0);
  // Reserva ~25% do tempo para as revisitas espaçadas.
  const studyBudget = Math.max(input.topics.length * MIN_STUDY, Math.floor(available * 0.75));

  // Por tópico: um bloco de estudo (quebrado no encaixe) e depois as questões.
  type Item = { topic: PlanTopic; kind: "study" | "questions"; minutes: number };
  const queue: Item[] = [];
  input.topics.forEach((t, i) => {
    const minutes = Math.max(MIN_STUDY, Math.round((studyBudget * need[i]) / needSum / 5) * 5);
    queue.push({ topic: t, kind: "study", minutes }, { topic: t, kind: "questions", minutes: qMinutes });
  });

  // Encaixa em ordem: o estudo é quebrado no espaço livre de cada dia (blocos de até 60 min).
  const learnedOn = new Map<string, number>();
  const studyPieces = new Map<string, PlanTask[]>();
  let di = 0;
  const free = () => cap - load(learnDays[di]);
  const advance = (need: number) => {
    while (di < learnDays.length - 1 && free() < need) di++;
  };
  for (const item of queue) {
    const t = item.topic;
    if (item.kind === "questions") {
      advance(item.minutes);
      learnDays[di].tasks.push({
        id: id("questions", t.id),
        kind: "questions",
        title: `${QUESTIONS_PER_TOPIC} questões de ${t.name}`,
        minutes: item.minutes,
        count: QUESTIONS_PER_TOPIC,
        topic_id: t.id,
      });
      learnedOn.set(t.id, di);
      continue;
    }
    let left = item.minutes;
    while (left > 0) {
      advance(Math.min(left, MIN_STUDY));
      const lastDay = di === learnDays.length - 1;
      const m = lastDay ? Math.min(left, MAX_STUDY_BLOCK) : Math.min(left, MAX_STUDY_BLOCK, Math.max(free(), MIN_STUDY));
      const task: PlanTask = { id: id("study", t.id), kind: "study", title: `Estudar ${t.name}`, minutes: m, topic_id: t.id };
      learnDays[di].tasks.push(task);
      studyPieces.set(t.id, [...(studyPieces.get(t.id) ?? []), task]);
      left -= m; // no último dia de estudo, o que não couber fica nele mesmo (plano apertado)
    }
  }
  for (const pieces of studyPieces.values()) {
    if (pieces.length > 1) pieces.forEach((p, i) => (p.title = `${p.title} (parte ${i + 1}/${pieces.length})`));
  }

  // Revisitas espaçadas de cada tópico: no dia alvo ou no próximo com espaço, antes da reta final.
  for (const t of input.topics) {
    const d0 = learnedOn.get(t.id);
    if (d0 == null) continue;
    for (const off of REVISIT_OFFSETS) {
      if (d0 + off >= learnDays.length) break;
      let target = d0 + off;
      while (target < learnDays.length - 1 && load(learnDays[target]) + 8 > cap) target++;
      learnDays[target].tasks.push({
        id: id("revisit", t.id),
        kind: "revisit",
        title: `Revisitar ${t.name}: 5 questões`,
        minutes: 8,
        count: 5,
        topic_id: t.id,
      });
    }
  }
  return days;
}

function dayLoad(d: PlanDay) {
  return d.tasks.filter((t) => !t.done).reduce((s, t) => s + t.minutes, 0);
}

/**
 * Espalha tarefas pelos dias de `targets` (em ordem), respeitando a capacidade;
 * sem espaço, coloca no dia menos cheio. A reta final (simulado) só recebe se não houver outro dia.
 */
function redistribute(tasks: PlanTask[], targets: PlanDay[], minutesPerDay: number) {
  if (targets.length === 0) return;
  const preferred = targets.filter((d) => !d.tasks.some((t) => t.kind === "simulado" || t.kind === "weak"));
  const pool = preferred.length ? preferred : targets;
  for (const task of tasks) {
    const fit = pool.find((d) => dayLoad(d) + task.minutes <= minutesPerDay);
    const day = fit ?? pool.reduce((a, b) => (dayLoad(b) < dayLoad(a) ? b : a));
    day.tasks.push(task);
  }
}

/**
 * O aluno marcou o dia como não feito: as tarefas pendentes (menos a revisão diária, que é do dia)
 * vão para os dias seguintes. As já feitas ficam onde estão.
 */
export function markMissed(days: PlanDay[], date: string, minutesPerDay: number): PlanDay[] {
  const out: PlanDay[] = days.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t })) }));
  const day = out.find((d) => d.date === date);
  if (!day || day.status === "done") return out;
  const moving = day.tasks.filter((t) => !t.done && isMovable(t)).map((t) => ({ ...t, moved_from: t.moved_from ?? date }));
  day.tasks = day.tasks.filter((t) => t.done || !isMovable(t));
  day.status = "missed";
  const future = out.filter((d) => d.date > date && d.status === "pending");
  redistribute(moving, future, minutesPerDay);
  return out;
}

/** Ao abrir o plano: dias que já passaram sem ser concluídos viram "não feitos" e se reorganizam sozinhos. */
export function autoReplan(days: PlanDay[], today: string, minutesPerDay: number): { days: PlanDay[]; changed: boolean } {
  let out = days;
  let changed = false;
  for (const d of days) {
    if (d.date < today && d.status === "pending") {
      out = markMissed(out, d.date, minutesPerDay);
      changed = true;
    }
  }
  return { days: out, changed };
}

export function markDone(days: PlanDay[], date: string): PlanDay[] {
  return days.map((d) =>
    d.date === date ? { ...d, status: "done" as const, tasks: d.tasks.map((t) => ({ ...t, done: true })) } : d,
  );
}

export function toggleTask(days: PlanDay[], date: string, taskId: string, done: boolean): PlanDay[] {
  return days.map((d) =>
    d.date === date ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) } : d,
  );
}

/** Refaz o plano a partir de hoje (ex.: chegaram os tópicos), mantendo o histórico e o que já foi feito hoje. */
export function regenerateFrom(days: PlanDay[], input: PlanInput): PlanDay[] {
  const past = days.filter((d) => d.date < input.today);
  const today = days.find((d) => d.date === input.today);
  const fresh = buildPlan(input);
  if (today && fresh[0]?.date === input.today) {
    const doneToday = today.tasks.filter((t) => t.done);
    fresh[0] = { ...fresh[0], status: today.status, tasks: [...doneToday, ...fresh[0].tasks.filter((t) => !doneToday.some((x) => x.kind === t.kind && x.title === t.title))] };
  }
  return [...past, ...fresh];
}

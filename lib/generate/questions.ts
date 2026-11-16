import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import {
  questionsPrompt,
  trueFalsePrompt,
  type Difficulty,
  type GeneratedQuestions,
  type GeneratedTrueFalse,
} from "@/lib/ai/prompts/questions";
import { sourceAt, type SourceChunk } from "@/lib/ai/prompts/sources";
import { UserFacingError } from "@/lib/errors";
import { EXAM_STYLE_LABELS, STYLE_SPECS, type ExamStyle } from "@/lib/exam-styles";
import { indexToLetter, shuffleOptions } from "@/lib/quiz/options";
import type { Database } from "@/lib/supabase/database.types";
import { findQuote } from "@/lib/text/quote";

import { pickChunks, splitCounts } from "./pick";

type DB = SupabaseClient<Database>;
type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];
export type GenChunk = SourceChunk & { topic_id?: string | null };

const QUESTIONS_PER_CALL = 10;
export const TRUE_FALSE_OPTIONS = ["Certo", "Errado"];

export type ValidatedQuestion = {
  chunk: GenChunk;
  quote: string;
  stem: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  type: "multiple_choice" | "true_false";
};

/** Acha o trecho que contém a citação: o indicado pela IA ou, se ela errou o número, outro trecho enviado. */
function locate<T extends SourceChunk>(chunks: T[], source: number, quote: string): T | null {
  const claimed = sourceAt(chunks, source);
  if (claimed && findQuote(claimed.content, quote)) return claimed;
  return chunks.find((c) => findQuote(c.content, quote)) ?? null;
}

/**
 * D1 — toda questão tem fonte. Liga cada questão ao trecho citado e confere que a citação
 * existe de verdade no trecho. Se a IA errou o número do trecho mas a citação está em outro
 * trecho enviado, corrige; se a citação não existe em lugar nenhum, a questão é descartada.
 */
export function validateQuestions<T extends GenChunk>(generated: GeneratedQuestions, chunks: T[]): ValidatedQuestion[] {
  const out: ValidatedQuestion[] = [];
  for (const q of generated.questions) {
    const chunk = locate(chunks, q.source, q.quote);
    if (!chunk) continue;
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) continue;
    out.push({
      chunk,
      quote: q.quote,
      stem: q.stem,
      options: q.options,
      answerIndex: q.answer_index,
      explanation: q.explanation,
      difficulty: q.difficulty,
      type: "multiple_choice",
    });
  }
  return out;
}

/** Mesma checagem de fonte para itens de certo ou errado. */
export function validateTrueFalse<T extends GenChunk>(generated: GeneratedTrueFalse, chunks: T[]): ValidatedQuestion[] {
  const out: ValidatedQuestion[] = [];
  for (const it of generated.items) {
    const chunk = locate(chunks, it.source, it.quote);
    if (!chunk) continue;
    out.push({
      chunk,
      quote: it.quote,
      stem: it.statement,
      options: TRUE_FALSE_OPTIONS,
      answerIndex: it.is_true ? 0 : 1,
      explanation: it.explanation,
      difficulty: it.difficulty,
      type: "true_false",
    });
  }
  return out;
}

export type GenerateQuizInput = {
  subjectId: string;
  materialId?: string;
  topicId?: string;
  count: number;
  difficulty: Difficulty | "misturada";
  /** sem estilo = o da matéria */
  style?: ExamStyle;
  mode?: "pratica" | "simulado";
};

/** Gera questões a partir dos trechos da matéria, salva e cria o quiz. Usa o cliente do usuário (RLS). */
export async function generateQuiz(supabase: DB, userId: string, input: GenerateQuizInput) {
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, exam_style")
    .eq("id", input.subjectId)
    .maybeSingle();
  if (!subject) throw new UserFacingError("Matéria não encontrada.");
  const style = (input.style ?? subject.exam_style) as ExamStyle;
  const spec = STYLE_SPECS[style];

  let q = supabase
    .from("chunks")
    .select("id, material_id, chunk_index")
    .eq("subject_id", input.subjectId)
    .order("material_id")
    .order("chunk_index")
    .limit(5000);
  if (input.materialId) q = q.eq("material_id", input.materialId);
  if (input.topicId) q = q.eq("topic_id", input.topicId);
  const { data: index } = await q;
  if (!index?.length) {
    throw new UserFacingError(
      input.topicId
        ? "Esse tópico ainda não tem trechos do material."
        : "Envie um material e espere ele ficar pronto antes de gerar questões.",
    );
  }

  const { data: usedRows } = await supabase
    .from("questions")
    .select("chunk_id")
    .eq("subject_id", input.subjectId)
    .not("chunk_id", "is", null);
  const used = new Set((usedRows ?? []).map((r) => r.chunk_id as string));

  const picked = pickChunks(index, used, input.count);
  const { data: contents } = await supabase
    .from("chunks")
    .select("id, page, content, topic_id")
    .in(
      "id",
      picked.map((c) => c.id),
    );
  const byId = new Map((contents ?? []).map((c) => [c.id, c]));
  const sources: GenChunk[] = picked.map((c) => byId.get(c.id)).filter((c): c is NonNullable<typeof c> => !!c);

  const inserted = await createQuestions(supabase, userId, {
    subjectId: input.subjectId,
    sources,
    count: input.count,
    difficulty: input.difficulty,
    style,
    origin: "quiz",
  });

  const simulado = input.mode === "simulado";
  const n = inserted.length;
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      material_id: input.materialId ?? null,
      topic_id: input.topicId ?? null,
      title: `${simulado ? "Simulado" : subject.name} — ${n} ${spec.format === "true_false" ? "itens" : "questões"}${style !== "livre" ? ` (${EXAM_STYLE_LABELS[style]})` : ""}`,
      difficulty: input.difficulty,
      style,
      mode: simulado ? "simulado" : "pratica",
      time_limit_s: simulado ? Math.round(n * spec.minutesPerQuestion * 60) : null,
      question_ids: inserted.map((r) => r.id),
    })
    .select("id")
    .single();
  if (quizError || !quiz) throw quizError ?? new Error("Falha ao criar o quiz");

  return { quizId: quiz.id, count: n, requested: input.count };
}

/**
 * Gera `count` questões a partir dos trechos dados (lotes de até 10 em paralelo), confere a fonte (D1)
 * e salva. Usado pelo quiz/simulado e pelo tutor das trilhas.
 */
export async function createQuestions(
  supabase: DB,
  userId: string,
  input: {
    subjectId: string;
    sources: GenChunk[];
    count: number;
    difficulty: Difficulty | "misturada";
    style: ExamStyle;
    origin: "quiz" | "tutor";
  },
) {
  const { sources, style } = input;
  const spec = STYLE_SPECS[style];
  const counts = splitCounts(input.count, QUESTIONS_PER_CALL);
  const batches = counts.map((n, b) => {
    const share = sources.length > input.count ? sources : sources.filter((_, i) => i % counts.length === b);
    return { n, chunks: share.length ? share : sources };
  });
  const results = await Promise.all(
    batches.map(async ({ n, chunks }) => {
      if (spec.format === "true_false") {
        const { data } = await generateJSON(trueFalsePrompt({ chunks, count: n, difficulty: input.difficulty }));
        return validateTrueFalse(data, chunks);
      }
      const { data } = await generateJSON(questionsPrompt({ chunks, count: n, difficulty: input.difficulty, style }));
      return validateQuestions(data, chunks);
    }),
  );
  const valid = results.flat().slice(0, input.count);
  if (valid.length === 0) throw new UserFacingError("Não foi possível gerar questões com base no material. Tente de novo.");

  const rows: QuestionInsert[] = valid.map((v) => {
    // Certo/Errado mantém a ordem; múltipla escolha é embaralhada.
    const shuffled =
      v.type === "true_false" ? { options: v.options, answerIndex: v.answerIndex } : shuffleOptions(v.options, v.answerIndex);
    return {
      user_id: userId,
      subject_id: input.subjectId,
      chunk_id: v.chunk.id,
      topic_id: v.chunk.topic_id ?? null,
      type: v.type,
      stem: v.stem,
      options_json: shuffled.options,
      answer: indexToLetter(shuffled.answerIndex),
      explanation: v.explanation,
      difficulty: v.difficulty,
      style,
      source_page: v.chunk.page,
      source_quote: v.quote,
      origin: input.origin,
    };
  });
  const { data: inserted, error } = await supabase.from("questions").insert(rows).select("id");
  if (error || !inserted) throw error ?? new Error("Falha ao salvar questões");
  return inserted;
}

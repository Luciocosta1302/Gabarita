import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJSON } from "@/lib/ai/provider";
import { questionsPrompt, type Difficulty, type GeneratedQuestions } from "@/lib/ai/prompts/questions";
import { sourceAt, type SourceChunk } from "@/lib/ai/prompts/sources";
import { UserFacingError } from "@/lib/errors";
import { EXAM_STYLE_LABELS, type ExamStyle } from "@/lib/exam-styles";
import { indexToLetter, shuffleOptions } from "@/lib/quiz/options";
import type { Database } from "@/lib/supabase/database.types";
import { findQuote } from "@/lib/text/quote";

import { pickChunks, splitCounts } from "./pick";

type DB = SupabaseClient<Database>;
type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];

const QUESTIONS_PER_CALL = 10;

export type ValidatedQuestion = {
  chunk: SourceChunk;
  quote: string;
  stem: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
};

/**
 * D1 — toda questão tem fonte. Liga cada questão ao trecho citado e confere que a citação
 * existe de verdade no trecho. Se a IA errou o número do trecho mas a citação está em outro
 * trecho enviado, corrige; se a citação não existe em lugar nenhum, a questão é descartada.
 */
export function validateQuestions(generated: GeneratedQuestions, chunks: SourceChunk[]): ValidatedQuestion[] {
  const out: ValidatedQuestion[] = [];
  for (const q of generated.questions) {
    const claimed = sourceAt(chunks, q.source);
    const chunk =
      claimed && findQuote(claimed.content, q.quote) ? claimed : chunks.find((c) => findQuote(c.content, q.quote));
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
    });
  }
  return out;
}

export type GenerateQuizInput = {
  subjectId: string;
  materialId?: string;
  count: number;
  difficulty: Difficulty | "misturada";
};

/** Gera questões a partir dos trechos da matéria, salva e cria o quiz. Usa o cliente do usuário (RLS). */
export async function generateQuiz(supabase: DB, userId: string, input: GenerateQuizInput) {
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, exam_style")
    .eq("id", input.subjectId)
    .maybeSingle();
  if (!subject) throw new UserFacingError("Matéria não encontrada.");

  let q = supabase
    .from("chunks")
    .select("id, material_id, chunk_index")
    .eq("subject_id", input.subjectId)
    .order("material_id")
    .order("chunk_index")
    .limit(5000);
  if (input.materialId) q = q.eq("material_id", input.materialId);
  const { data: index } = await q;
  if (!index?.length) throw new UserFacingError("Envie um material e espere ele ficar pronto antes de gerar questões.");

  const { data: usedRows } = await supabase
    .from("questions")
    .select("chunk_id")
    .eq("subject_id", input.subjectId)
    .not("chunk_id", "is", null);
  const used = new Set((usedRows ?? []).map((r) => r.chunk_id as string));

  const picked = pickChunks(index, used, input.count);
  const { data: contents } = await supabase
    .from("chunks")
    .select("id, page, content")
    .in(
      "id",
      picked.map((c) => c.id),
    );
  const byId = new Map((contents ?? []).map((c) => [c.id, c]));
  const sources: SourceChunk[] = picked.map((c) => byId.get(c.id)).filter((c): c is SourceChunk => !!c);

  // Lotes de até 10 questões em paralelo, cada um com a sua parte dos trechos.
  const counts = splitCounts(input.count, QUESTIONS_PER_CALL);
  const style = subject.exam_style as ExamStyle;
  const styleHint = style !== "livre" ? EXAM_STYLE_LABELS[style] : undefined;
  const batches = counts.map((n, b) => {
    const share = sources.length > input.count ? sources : sources.filter((_, i) => i % counts.length === b);
    return { n, chunks: share.length ? share : sources };
  });
  const results = await Promise.all(
    batches.map(async ({ n, chunks }) => {
      const { data } = await generateJSON(questionsPrompt({ chunks, count: n, difficulty: input.difficulty, styleHint }));
      return validateQuestions(data, chunks);
    }),
  );
  const valid = results.flat().slice(0, input.count);
  if (valid.length === 0) throw new UserFacingError("Não foi possível gerar questões com base no material. Tente de novo.");

  const rows: QuestionInsert[] = valid.map((v) => {
    const shuffled = shuffleOptions(v.options, v.answerIndex);
    return {
      user_id: userId,
      subject_id: input.subjectId,
      chunk_id: v.chunk.id,
      type: "multiple_choice",
      stem: v.stem,
      options_json: shuffled.options,
      answer: indexToLetter(shuffled.answerIndex),
      explanation: v.explanation,
      difficulty: v.difficulty,
      style: subject.exam_style,
      source_page: v.chunk.page,
      source_quote: v.quote,
      origin: "quiz",
    };
  });
  const { data: inserted, error } = await supabase.from("questions").insert(rows).select("id");
  if (error || !inserted) throw error ?? new Error("Falha ao salvar questões");

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      material_id: input.materialId ?? null,
      title: `${subject.name} — ${inserted.length} questões`,
      difficulty: input.difficulty,
      question_ids: inserted.map((r) => r.id),
    })
    .select("id")
    .single();
  if (quizError || !quiz) throw quizError ?? new Error("Falha ao criar o quiz");

  return { quizId: quiz.id, count: inserted.length, requested: input.count };
}

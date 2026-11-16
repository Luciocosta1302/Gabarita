import { describe, expect, it } from "vitest";

import { GROUNDING_RULE } from "@/lib/ai/prompts/base";
import { feynmanPrompt } from "@/lib/ai/prompts/feynman";
import { gradeOpenPrompt, openQuestionsPrompt } from "@/lib/ai/prompts/open";
import { questionsPrompt } from "@/lib/ai/prompts/questions";
import { solvePhotoPrompt } from "@/lib/ai/prompts/solve-photo";
import { teacherProfilePrompt, teacherStyleGuide } from "@/lib/ai/prompts/teacher";
import { encodeWav, resample, toMono } from "@/lib/audio/wav";
import { validateOpen } from "@/lib/generate/questions";
import { rubricScore } from "@/lib/quiz/rubric";
import { mapLikelyTopics, teacherOptionsCount } from "@/lib/teacher/logic";
import { materialTypeFor } from "@/lib/validation/upload";

const chunks = [
  { id: "c1", page: 2, content: "A respiração celular acontece nas mitocôndrias. Ela libera energia na forma de ATP para a célula." },
  { id: "c2", page: 5, content: "A fotossíntese ocorre nos cloroplastos e transforma energia luminosa em energia química." },
];

describe("discursivas com rubrica (D10)", () => {
  it("nota = média ponderada (conteúdo 50%, clareza 25%, termos 25%)", () => {
    expect(rubricScore([{ criterion: "conteudo", score: 8 }, { criterion: "clareza", score: 6 }, { criterion: "termos", score: 4 }])).toBe(6.5);
    expect(rubricScore([{ criterion: "conteudo", score: 10 }])).toBe(5);
    expect(rubricScore([{ criterion: "conteudo", score: 15 }, { criterion: "clareza", score: -2 }, { criterion: "termos", score: 10 }])).toBe(7.5);
  });

  it("questão discursiva só passa com citação que existe no trecho", () => {
    const p = openQuestionsPrompt({ chunks, count: 2, difficulty: "media" });
    const data = p.mock();
    expect(p.schema.safeParse(data).success).toBe(true);
    const v = validateOpen(data, chunks);
    expect(v).toHaveLength(2);
    expect(v[0]).toMatchObject({ type: "open", options: [] });
    expect(v[0].rubric!.key_points.length).toBeGreaterThan(0);
    expect(validateOpen({ questions: [{ ...data.questions[0], quote: "frase inventada que não está lá" }] }, chunks)).toEqual([]);
  });

  it("correção de teste: resposta em branco tira 0 em conteúdo; boa resposta passa", () => {
    const base = { stem: "Explique", expected: "x", keyPoints: ["respiração celular nas mitocôndrias"], keyTerms: [], source: null };
    const bad = gradeOpenPrompt({ ...base, answer: "não sei" }).mock();
    const good = gradeOpenPrompt({ ...base, answer: "A respiração celular acontece nas mitocôndrias e gera ATP para a célula usar como energia." }).mock();
    expect(bad.criteria.find((c) => c.criterion === "conteudo")!.score).toBe(0);
    expect(rubricScore(good.criteria)).toBeGreaterThanOrEqual(6);
  });
});

describe("Prova do Professor (D4)", () => {
  const topics = [
    { id: "t1", name: "Respiração" },
    { id: "t2", name: "Fotossíntese" },
  ];

  it("liga os tópicos que mais caem aos tópicos do material, do mais provável ao menos", () => {
    const p = teacherProfilePrompt({ exams: [{ title: "P1", text: "Questão 1. Sobre a respiração celular, é correto afirmar que..." }], topics }).mock();
    const profile = { ...p, likely_topics: [
      { name: "Foto", topic: 2, weight: 3, reason: "r" },
      { name: "Resp", topic: 1, weight: 5, reason: "r" },
      { name: "Sem par", topic: 0, weight: 5, reason: "r" },
      { name: "Repetido", topic: 1, weight: 2, reason: "r" },
    ] };
    expect(mapLikelyTopics(profile, topics)).toEqual([
      { topicId: "t1", name: "Respiração", weight: 5, reason: "r" },
      { topicId: "t2", name: "Fotossíntese", weight: 3, reason: "r" },
    ]);
  });

  it("o estilo do professor vai para o prompt de questões", () => {
    const profile = teacherProfilePrompt({ exams: [{ title: "P1", text: "Questão 1. Sobre a respiração celular, é correto afirmar que..." }], topics }).mock();
    const guide = teacherStyleGuide(profile);
    expect(guide).toContain("Pegadinhas");
    const q = questionsPrompt({ chunks, count: 1, difficulty: "media", styleGuide: guide, options: teacherOptionsCount(profile) });
    expect(q.prompt).toContain(guide);
    expect(q.prompt).toContain("5 alternativas");
    expect(q.mock().questions[0].options).toHaveLength(5);
  });
});

describe("prompts da Fase 3", () => {
  it("mocks passam no schema; os que comparam com o material têm a regra de usar só o material", () => {
    const grounded = [
      openQuestionsPrompt({ chunks, count: 1, difficulty: "facil" }),
      gradeOpenPrompt({ stem: "?", expected: "x", keyPoints: ["a"], keyTerms: [], source: null, answer: "y" }),
      feynmanPrompt({ topic: "Respiração", explanation: "A respiração celular acontece nas mitocôndrias.", chunks }),
    ];
    for (const p of grounded) {
      expect(p.schema.safeParse(p.mock()).success).toBe(true);
      expect(p.system).toContain(GROUNDING_RULE);
    }
    for (const p of [solvePhotoPrompt(), teacherProfilePrompt({ exams: [{ title: "P", text: "texto" }], topics: [] })]) {
      expect(p.schema.safeParse(p.mock()).success).toBe(true);
    }
  });

  it("Feynman de teste: explicar com as palavras do material dá nota maior", () => {
    const weak = feynmanPrompt({ topic: "R", explanation: "não lembro bem", chunks }).mock();
    const strong = feynmanPrompt({ topic: "R", explanation: "A respiração celular acontece nas mitocôndrias.", chunks }).mock();
    expect(strong.score).toBeGreaterThan(weak.score);
  });
});

describe("áudio", () => {
  it("upload de áudio de aula vira material do tipo áudio", () => {
    expect(materialTypeFor([{ name: "aula.mp3", type: "audio/mpeg", size: 100 }])).toEqual({ type: "audio" });
    expect(materialTypeFor([{ name: "aula.m4a", type: "", size: 100 }])).toEqual({ type: "audio" });
  });

  it("WAV mono 16 kHz com cabeçalho correto", () => {
    const samples = new Float32Array(48_000).map((_, i) => Math.sin(i / 10));
    const mono = toMono([samples, samples]);
    const r = resample(mono, 48_000);
    expect(r.length).toBe(16_000);
    const wav = encodeWav(r);
    const v = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe("WAVE");
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint16(22, true)).toBe(1);
    expect(wav.length).toBe(44 + 16_000 * 2);
  });
});

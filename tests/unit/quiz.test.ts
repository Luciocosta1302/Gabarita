import { describe, expect, it } from "vitest";

import { pickChunks, splitCounts } from "@/lib/generate/pick";
import { confidenceStats, falseCertaintyMessage } from "@/lib/quiz/confidence";
import { indexToLetter, isCorrect, letterToIndex, shuffleOptions } from "@/lib/quiz/options";

describe("alternativas", () => {
  it("letra <-> índice", () => {
    expect(indexToLetter(2)).toBe("C");
    expect(letterToIndex("c")).toBe(2);
    expect(letterToIndex("Z")).toBe(-1);
  });

  it("embaralhar mantém a correta apontando para o mesmo texto", () => {
    const options = ["certa", "b", "c", "d"];
    for (let seed = 0; seed < 20; seed++) {
      let x = seed + 1;
      const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      const s = shuffleOptions(options, 0, rand);
      expect(s.options[s.answerIndex]).toBe("certa");
      expect([...s.options].sort()).toEqual([...options].sort());
    }
  });

  it("corrige pela letra", () => {
    expect(isCorrect("b", "B")).toBe(true);
    expect(isCorrect("A", "B")).toBe(false);
    expect(isCorrect("?", "?")).toBe(false);
  });
});

describe("medidor de falsa certeza (D7)", () => {
  const attempts = [
    { correct: false, confidence: "certeza" },
    { correct: true, confidence: "certeza" },
    { correct: false, confidence: "certeza" },
    { correct: true, confidence: "certeza" },
    { correct: true, confidence: "chutei" },
    { correct: false, confidence: null },
  ];

  it("calcula a taxa de erro por nível", () => {
    const stats = confidenceStats(attempts);
    expect(stats.find((s) => s.level === "certeza")).toEqual({ level: "certeza", total: 4, correct: 2, wrongRate: 0.5 });
    expect(stats.find((s) => s.level === "acho")?.wrongRate).toBeNull();
  });

  it("mensagem principal", () => {
    expect(falseCertaintyMessage(confidenceStats(attempts))).toBe(
      'Quando você marca "tenho certeza", erra 50% das vezes (2 de 4).',
    );
    expect(falseCertaintyMessage(confidenceStats([]))).toBeNull();
  });
});

describe("escolha de trechos", () => {
  const chunks = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}` }));

  it("espalha pelo material e prefere trechos não usados", () => {
    const used = new Set(chunks.slice(0, 10).map((c) => c.id));
    const picked = pickChunks(chunks, used, 5, () => 0);
    expect(picked).toHaveLength(5);
    expect(picked.every((c) => !used.has(c.id))).toBe(true);
    expect(new Set(picked.map((c) => c.id)).size).toBe(5);
  });

  it("com poucos trechos devolve todos", () => {
    expect(pickChunks(chunks.slice(0, 3), new Set(), 10)).toHaveLength(3);
  });

  it("divide em lotes parecidos", () => {
    expect(splitCounts(25, 10)).toEqual([9, 8, 8]);
    expect(splitCounts(10, 10)).toEqual([10]);
    expect(splitCounts(3, 10)).toEqual([3]);
  });
});

import { simuladoReport } from "@/lib/quiz/report";

describe("relatório do simulado (D16)", () => {
  const questions = [
    { id: "q1", topicName: "Genética" },
    { id: "q2", topicName: "Genética" },
    { id: "q3", topicName: "Citologia" },
    { id: "q4", topicName: "Citologia" },
  ];
  const attempts = [
    { question_id: "q1", correct: false, time_ms: 60_000 },
    { question_id: "q2", correct: false, time_ms: 30_000 },
    { question_id: "q3", correct: true, time_ms: 30_000 },
  ];
  const r = simuladoReport({
    questions,
    attempts,
    style: "cebraspe",
    timeLimitS: 600,
    startedAt: "2026-11-16T10:00:00Z",
    finishedAt: "2026-11-16T10:04:00Z",
  });

  it("conta certas, erradas e em branco", () => {
    expect([r.correct, r.wrong, r.blank, r.percent]).toEqual([1, 2, 1, 25]);
  });
  it("nota Cebraspe: errada anula certa", () => {
    expect(r.cebraspeNet).toBe(-1);
  });
  it("tempo usado e média por questão respondida", () => {
    expect(r.usedMs).toBe(240_000);
    expect(r.avgMsPerAnswered).toBe(40_000);
    expect(r.timeByQuestion[3]).toEqual({ id: "q4", index: 3, ms: null, correct: null });
  });
  it("tópicos fracos do pior para o melhor", () => {
    expect(r.weakTopics).toEqual([
      { name: "Genética", correct: 0, total: 2 },
      { name: "Citologia", correct: 1, total: 2 },
    ]);
  });
  it("sem Cebraspe não tem nota líquida", () => {
    expect(simuladoReport({ questions, attempts, style: "enem", timeLimitS: 60, startedAt: null, finishedAt: null }).cebraspeNet).toBeNull();
  });
});

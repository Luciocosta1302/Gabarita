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

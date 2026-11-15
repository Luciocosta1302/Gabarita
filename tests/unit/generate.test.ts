import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { generateJSON, setProvider } from "@/lib/ai/provider";
import { chatPrompt } from "@/lib/ai/prompts/chat";
import { errorFollowupPrompt } from "@/lib/ai/prompts/error-followup";
import { flashcardsPrompt } from "@/lib/ai/prompts/flashcards";
import { ocrImagePrompt, ocrPdfPrompt } from "@/lib/ai/prompts/ocr";
import { questionsPrompt, type GeneratedQuestions } from "@/lib/ai/prompts/questions";
import { formatSources } from "@/lib/ai/prompts/sources";
import { summaryMergePrompt, summaryPrompt } from "@/lib/ai/prompts/summary";
import { MockProvider } from "@/lib/ai/providers/mock";
import { validateQuestions } from "@/lib/generate/questions";
import { groupByChars } from "@/lib/generate/summary";
import { GROUNDING_RULE } from "@/lib/ai/prompts/base";

afterEach(() => setProvider(null));

const chunks = [
  { id: "c1", page: 1, content: "A fotossíntese ocorre nos cloroplastos das células vegetais. Ela produz glicose." },
  { id: "c2", page: 4, content: "A respiração celular acontece nas mitocôndrias. Ela libera energia na forma de ATP." },
];

const q = (over: Partial<GeneratedQuestions["questions"][number]>) => ({
  source: 1,
  quote: "A fotossíntese ocorre nos cloroplastos",
  stem: "Onde ocorre a fotossíntese?",
  options: ["Cloroplastos", "Mitocôndrias", "Núcleo", "Ribossomos"],
  answer_index: 0,
  explanation: "O material diz que ocorre nos cloroplastos.",
  difficulty: "facil" as const,
  ...over,
});

describe("D1 — validateQuestions", () => {
  it("mantém a questão cuja citação existe no trecho", () => {
    const [v] = validateQuestions({ questions: [q({})] }, chunks);
    expect(v.chunk.id).toBe("c1");
  });

  it("corrige o trecho quando a citação está em outro trecho enviado", () => {
    const [v] = validateQuestions({ questions: [q({ source: 1, quote: "A respiração celular acontece nas mitocôndrias" })] }, chunks);
    expect(v.chunk.id).toBe("c2");
  });

  it("descarta questão com citação inventada, trecho inexistente ou alternativas repetidas", () => {
    const out = validateQuestions(
      {
        questions: [
          q({ quote: "A fotossíntese ocorre no núcleo" }),
          q({ source: 9, quote: "frase que não existe em lugar nenhum" }),
          q({ options: ["A", "a", "B", "C"] }),
        ],
      },
      chunks,
    );
    expect(out).toHaveLength(0);
  });
});

describe("prompts", () => {
  it("todos os prompts de conteúdo têm a regra de usar só o material", () => {
    const prompts = [
      questionsPrompt({ chunks, count: 2, difficulty: "media" }),
      flashcardsPrompt({ chunks, count: 2 }),
      summaryPrompt({ title: "Bio", chunks }),
      chatPrompt({ question: "?", history: [], chunks }),
      errorFollowupPrompt({ stem: "x", options: ["a", "b"], correctIndex: 0, chosenIndex: 1, explanation: null, source: null }),
    ];
    for (const p of prompts) expect(p.system).toContain(GROUNDING_RULE);
  });

  it("os trechos vão numerados com a página", () => {
    expect(formatSources(chunks)).toContain("[T2] (página 4)");
  });

  it("as respostas falsas (mock) de cada prompt passam no próprio schema", () => {
    const all: { schema: z.ZodType; mock: () => unknown }[] = [
      questionsPrompt({ chunks, count: 5, difficulty: "misturada" }),
      flashcardsPrompt({ chunks, count: 3 }),
      summaryPrompt({ title: "Bio", chunks }),
      summaryMergePrompt({ title: "Bio", partials: [summaryPrompt({ title: "Bio", chunks }).mock()] }),
      chatPrompt({ question: "?", history: [], chunks }),
      chatPrompt({ question: "?", history: [], chunks: [] }),
      errorFollowupPrompt({ stem: "x", options: ["a", "b"], correctIndex: 0, chosenIndex: 1, explanation: null, source: chunks[0] }),
      ocrImagePrompt(),
      ocrPdfPrompt({ from: 2, to: 4 }),
    ];
    for (const p of all) expect(p.schema.safeParse(p.mock()).success).toBe(true);
  });

  it("as questões do mock citam o trecho de verdade (passam na validação D1)", () => {
    const p = questionsPrompt({ chunks, count: 4, difficulty: "media" });
    expect(validateQuestions(p.mock(), chunks)).toHaveLength(4);
  });

  it("o JSON Schema enviado à IA é gerado sem erro", () => {
    expect(() => z.toJSONSchema(questionsPrompt({ chunks, count: 1, difficulty: "facil" }).schema)).not.toThrow();
  });
});

describe("MockProvider + generateJSON", () => {
  it("usa o mock do prompt quando não há resposta enfileirada", async () => {
    setProvider(new MockProvider());
    const { data } = await generateJSON(flashcardsPrompt({ chunks, count: 2 }));
    expect(data.cards).toHaveLength(2);
  });

  it("resposta enfileirada tem prioridade e a validação Zod continua valendo", async () => {
    setProvider(new MockProvider().enqueue('{"cards":[]}'));
    const { data } = await generateJSON(flashcardsPrompt({ chunks, count: 2 }));
    expect(data.cards).toEqual([]);
  });
});

describe("resumo de material grande", () => {
  it("agrupa trechos por tamanho", () => {
    const items = [{ content: "a".repeat(40) }, { content: "b".repeat(40) }, { content: "c".repeat(40) }];
    expect(groupByChars(items, 100).map((g) => g.length)).toEqual([2, 1]);
  });
});

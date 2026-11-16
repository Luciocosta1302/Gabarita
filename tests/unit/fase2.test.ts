import { describe, expect, it } from "vitest";
import { z } from "zod";

import { questionsPrompt, trueFalsePrompt } from "@/lib/ai/prompts/questions";
import { errorFollowupTfPrompt } from "@/lib/ai/prompts/error-followup";
import { topicsPrompt } from "@/lib/ai/prompts/topics";
import { STYLE_SPECS, isTrueFalse, selectableStyle, simuladoStyle } from "@/lib/exam-styles";
import { validateTrueFalse } from "@/lib/generate/questions";
import { gradeFromAttempt, newCard, review } from "@/lib/srs/fsrs";
import { resolveAssignments } from "@/lib/topics/cluster";

const chunks = [
  { id: "c1", page: 1, content: "A fotossíntese ocorre nos cloroplastos das células vegetais. Ela produz glicose e oxigênio." },
  { id: "c2", page: 2, content: "A respiração celular acontece nas mitocôndrias. Ela libera energia na forma de ATP." },
];

describe("repetição espaçada (D3)", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  it("cartão novo vence agora", () => {
    expect(newCard(now).dueAt).toBe(now.toISOString());
  });

  it("quanto melhor a nota, mais longe a próxima revisão", () => {
    const start = newCard(now).state;
    const due = (g: "again" | "hard" | "good" | "easy") => Date.parse(review(start, g, now).dueAt);
    expect(due("again")).toBeLessThan(due("good"));
    expect(due("good")).toBeLessThan(due("easy"));
    expect(due("again") - now.getTime()).toBeLessThan(60 * 60_000); // volta no mesmo dia
  });

  it("acertos seguidos espaçam cada vez mais", () => {
    let s = newCard(now).state;
    let t = now;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = review(s, "good", t);
      gaps.push(Date.parse(r.dueAt) - t.getTime());
      s = r.state;
      t = new Date(r.dueAt);
    }
    expect(gaps[3]).toBeGreaterThan(gaps[1]);
  });

  it("estado salvo como JSON volta a funcionar", () => {
    const r1 = review(null, "good", now);
    const json = JSON.parse(JSON.stringify(r1.state));
    expect(() => review(json, "good", new Date(r1.dueAt))).not.toThrow();
  });

  it("nota a partir da resposta + confiança", () => {
    expect(gradeFromAttempt(false, "certeza")).toBe("again");
    expect(gradeFromAttempt(true, "chutei")).toBe("hard");
    expect(gradeFromAttempt(true, "acho")).toBe("good");
    expect(gradeFromAttempt(true, "certeza")).toBe("easy");
  });
});

describe("estilos de banca (D5)", () => {
  it("cada banca tem número de alternativas e formato", () => {
    expect(STYLE_SPECS.enem).toMatchObject({ format: "multiple_choice", options: 5 });
    expect(STYLE_SPECS.cebraspe.format).toBe("true_false");
    expect(STYLE_SPECS.livre.options).toBe(4);
    expect(selectableStyle("discursiva")).toBe("discursiva");
    expect(simuladoStyle("discursiva")).toBe("livre"); // simulado só com objetivas
    expect(STYLE_SPECS.discursiva.format).toBe("open");
    expect(selectableStyle("fgv")).toBe("fgv");
  });

  it("o prompt leva as instruções da banca", () => {
    const p = questionsPrompt({ chunks, count: 2, difficulty: "media", style: "enem" });
    expect(p.prompt).toContain("5 alternativas");
    expect(p.prompt).toContain("Estilo ENEM");
    expect(p.mock().questions[0].options).toHaveLength(5);
  });

  it("Cebraspe: itens certo/errado com fonte conferida", () => {
    const p = trueFalsePrompt({ chunks, count: 4, difficulty: "misturada" });
    const data = p.mock();
    expect(p.schema.safeParse(data).success).toBe(true);
    const v = validateTrueFalse(data, chunks);
    expect(v).toHaveLength(4);
    expect(v.every((q) => isTrueFalse(q.options) && q.type === "true_false")).toBe(true);
    expect(v.map((q) => q.answerIndex)).toEqual([0, 1, 0, 1]);
    // citação inventada → descartado
    expect(validateTrueFalse({ items: [{ ...data.items[0], quote: "A fotossíntese ocorre no núcleo" }] }, chunks)).toEqual([]);
  });

  it("questão parecida de certo/errado passa no schema", () => {
    const p = errorFollowupTfPrompt({ statement: "x", isTrue: false, explanation: null, source: chunks[0] });
    expect(p.schema.safeParse(p.mock()).success).toBe(true);
  });

  it("JSON Schemas novos geram sem erro", () => {
    expect(() => z.toJSONSchema(trueFalsePrompt({ chunks, count: 1, difficulty: "facil" }).schema)).not.toThrow();
    expect(() => z.toJSONSchema(topicsPrompt({ subjectName: "x", existing: [], chunks: [] }).schema)).not.toThrow();
  });
});

describe("tópicos (D8)", () => {
  it("mock do prompt passa no schema", () => {
    const p = topicsPrompt({ subjectName: "Bio", existing: [], chunks: [{ preview: "a" }, { preview: "b" }] });
    expect(p.schema.safeParse(p.mock()).success).toBe(true);
  });

  it("trecho sem tópico herda o do anterior; tópico inválido é ignorado; tópico novo sem trecho não é criado", () => {
    const r = resolveAssignments(
      {
        new_topics: [
          { key: "N1", name: "Novo", summary: "" },
          { key: "N2", name: "Sobra", summary: "" },
        ],
        assignments: [
          { chunk: 1, topic: "E2" },
          { chunk: 2, topic: "X9" },
          { chunk: 3, topic: "N1" },
          { chunk: 99, topic: "N2" },
        ],
      },
      4,
      2,
    );
    expect(r.byChunk).toEqual([
      { kind: "existing", ref: 1 },
      { kind: "existing", ref: 1 },
      { kind: "new", ref: "N1" },
      { kind: "new", ref: "N1" },
    ]);
    expect(r.newTopics.map((t) => t.key)).toEqual(["N1"]);
  });

  it("referência a tópico existente fora do intervalo é inválida", () => {
    const r = resolveAssignments({ new_topics: [], assignments: [{ chunk: 1, topic: "E5" }] }, 1, 2);
    expect(r.byChunk).toEqual([{ kind: "existing", ref: 0 }]);
  });
});

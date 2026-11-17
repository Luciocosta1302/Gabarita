import { afterEach, describe, expect, it } from "vitest";

import { setProvider } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/providers/mock";
import type { AIProvider } from "@/lib/ai/types";
import { checkAnswers, keepChecked } from "@/lib/generate/answer-check";

afterEach(() => setProvider(null));

const source = "A fotossíntese ocorre nos cloroplastos. A respiração celular ocorre nas mitocôndrias.";

describe("gabarito conferido (resolução às cegas)", () => {
  it("mantém a questão quando a revisão chega à mesma alternativa e descarta quando discorda", async () => {
    setProvider(new MockProvider());
    const ok = await checkAnswers([
      // gabarito certo: a alternativa 1 é a que está no trecho
      { stem: "Onde ocorre a fotossíntese?", options: ["Nas mitocôndrias do núcleo", "A fotossíntese ocorre nos cloroplastos", "No ribossomo"], answerIndex: 1, source },
      // gabarito errado: marcou a 0, mas o trecho sustenta a 1
      { stem: "Onde ocorre a fotossíntese?", options: ["No ribossomo", "A fotossíntese ocorre nos cloroplastos"], answerIndex: 0, source },
      // nenhuma alternativa sustentada pelo trecho → revisão responde -1 → descarta
      { stem: "Qual é a cor do céu?", options: ["Azul", "Verde"], answerIndex: 0, source },
      // discursiva (sem alternativas) passa direto
      { stem: "Explique a fotossíntese.", options: [], answerIndex: -1, source },
    ]);
    expect(ok).toEqual([true, false, false, true]);
  });

  it("certo/errado também é conferido", async () => {
    setProvider(new MockProvider());
    const ok = await checkAnswers([
      { stem: "Item 1: A fotossíntese ocorre nos cloroplastos.", options: ["Certo", "Errado"], answerIndex: 0, source },
      { stem: "Item 2: é falso que a respiração ocorre nas mitocôndrias.", options: ["Certo", "Errado"], answerIndex: 0, source },
    ]);
    expect(ok).toEqual([true, false]);
  });

  it("se a revisão falhar, nenhuma questão objetiva passa (melhor menos do que gabarito errado)", async () => {
    const broken = new MockProvider() as unknown as AIProvider;
    broken.generateText = async () => {
      throw new Error("IA fora do ar");
    };
    setProvider(broken);
    const { kept, dropped } = await keepChecked([
      { stem: "Onde?", options: ["A fotossíntese ocorre nos cloroplastos", "Outra"], answerIndex: 0, source },
      { stem: "Explique.", options: [], answerIndex: -1, source },
    ]);
    expect(kept.map((k) => k.stem)).toEqual(["Explique."]);
    expect(dropped).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import { findQuote, pickSentence } from "@/lib/text/quote";

const content = "A fotossíntese ocorre nos\ncloroplastos. Ela usa “luz solar” — e água.";

describe("findQuote", () => {
  it("acha a citação mesmo com quebra de linha e maiúsculas diferentes", () => {
    const r = findQuote(content, "a fotossíntese ocorre nos cloroplastos");
    expect(r).not.toBeNull();
    expect(content.slice(...r!)).toBe("A fotossíntese ocorre nos\ncloroplastos");
  });

  it("tolera aspas/traços tipográficos e pontuação nas pontas", () => {
    expect(findQuote(content, '"Ela usa "luz solar" - e água."')).not.toBeNull();
  });

  it("devolve null para citação inventada", () => {
    expect(findQuote(content, "a fotossíntese ocorre nas mitocôndrias")).toBeNull();
    expect(findQuote(content, "   ")).toBeNull();
  });

  it("não quebra com caracteres especiais de regex", () => {
    expect(findQuote("f(x) = x^2 + [a]", "f(x) = x^2 + [a]")).toEqual([0, 16]);
  });
});

describe("pickSentence", () => {
  it("escolhe frases de tamanho razoável", () => {
    const s = pickSentence("Oi. Esta é uma frase longa o bastante para valer. Outra frase longa o bastante aqui.", 1);
    expect(s).toBe("Outra frase longa o bastante aqui.");
  });
});

import { CITATION_SPLIT, citationNumbers } from "@/lib/text/citations";

describe("marcadores de citação", () => {
  it("aceita [1], [1, 2], [T2] e [T1, T3]", () => {
    expect("A [1] B [T2] C [T1, T3] D [1,2]".split(CITATION_SPLIT).map(citationNumbers).filter(Boolean)).toEqual([[1], [2], [1, 3], [1, 2]]);
    expect(citationNumbers("[a]")).toBeNull();
    expect(citationNumbers("texto")).toBeNull();
  });
});

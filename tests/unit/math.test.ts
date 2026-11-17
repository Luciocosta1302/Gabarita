import { describe, expect, it } from "vitest";

import { plainMath, plainMathDeep } from "@/lib/text/math";

describe("matemática sem LaTeX na tela", () => {
  it("converte o que a IA escreveu na foto da questão", () => {
    expect(plainMath("(B) 5\\sqrt{3} cm")).toBe("(B) 5√3 cm");
    expect(plainMath("o ângulo (\\theta) é de 30°")).toBe("o ângulo (θ) é de 30°");
    expect(plainMath("$\\frac{1}{2} = \\frac{co}{10}$")).toBe("1/2 = co/10");
    expect(plainMath("sen(30^\\circ) = \\frac{\\sqrt{3}}{2}")).toBe("sen(30°) = √3/2");
    expect(plainMath("x^2 + y^{2} = r^2, a_1 = 3")).toBe("x² + y² = r², a₁ = 3");
    expect(plainMath("\\sqrt{x+1} \\cdot \\pi \\leq 10")).toBe("√(x+1) · π ≤ 10");
    expect(plainMath("\\text{área} = b \\times h")).toBe("área = b × h");
    // transcrição do vídeo: variável entre cifrões
    expect(plainMath("pegar o ângulo $x$ e o cateto $a$")).toBe("pegar o ângulo x e o cateto a");
    expect(plainMath("fica = $x / 12$. E $x = 12 / 2$, $x = 6\\,\\text{cm}$.")).toBe("fica = x / 12. E x = 12 / 2, x = 6cm.");
  });

  it("não mexe em texto comum", () => {
    for (const t of ["Custa R$ 10 e R$ 20.", "dados_pessoais", "Independência ou morte!", "1/2 de 10 é 5", "multiple_choice"]) {
      expect(plainMath(t)).toBe(t);
    }
  });

  it("aplica em todo o JSON, menos nas citações literais", () => {
    const out = plainMathDeep({ stem: "Quanto é \\sqrt{9}?", options: ["3", "\\pi"], quote: "trecho com \\sqrt{9}", n: 1 });
    expect(out).toEqual({ stem: "Quanto é √9?", options: ["3", "π"], quote: "trecho com \\sqrt{9}", n: 1 });
  });
});

/**
 * A IA às vezes escreve matemática em LaTeX ("5\sqrt{3}", "\theta", "$x^2$"), que na tela vira código.
 * Converte o LaTeX mais comum em símbolos comuns (√, θ, ², π...). Sem dependências.
 */
const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ", lambda: "λ", mu: "μ", pi: "π", sigma: "σ",
  Sigma: "Σ", omega: "ω", Omega: "Ω", phi: "φ", rho: "ρ", epsilon: "ε", varepsilon: "ε", tau: "τ",
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
  approx: "≈", infty: "∞", circ: "°", degree: "°", to: "→", rightarrow: "→", Rightarrow: "⇒", leftarrow: "←",
  in: "∈", cup: "∪", cap: "∩", subset: "⊂", forall: "∀", exists: "∃", angle: "∠", perp: "⊥", parallel: "∥",
  equiv: "≡", sim: "~", ldots: "…", dots: "…", cdots: "⋯", quad: " ", qquad: "  ",
};
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", n: "ⁿ" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };

const wrap = (s: string) => (/^[\p{L}\d.,√∛π²³]+$/u.test(s) ? s : `(${s})`);

export function plainMath(input: string): string {
  if (!/[\\$^_]/.test(input)) return input;
  let s = input;
  // delimitadores de fórmula: $...$, $$...$$, \( \), \[ \]
  // (só quando há sinal de fórmula dentro, para não estragar "R$ 10 e R$ 20")
  s = s
    .replace(/\$\$([^$]*[\\^_][^$]*)\$\$/g, "$1")
    .replace(/(?<!R)\$([^$\n]{0,80}[\\^_=/+*<>][^$\n]{0,80})\$/g, "$1")
    .replace(/\\[()[\]]/g, "")
    // variável solta entre cifrões: "o ângulo $x$" → "o ângulo x"
    .replace(/(?<![R\w])\$([A-Za-z0-9]{1,3})\$/g, "$1");
  s = s.replace(/\\(?:left|right|displaystyle|,|;|!)\s*/g, "");
  // \text{...}, \mathrm{...}
  s = s.replace(/\\(?:text|mathrm|mathbf|textbf|operatorname)\{([^{}]*)\}/g, "$1");
  // \frac{a}{b} e \sqrt{x} (de dentro para fora)
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${wrap(a)}/${wrap(b)}`);
    s = s.replace(/\\sqrt\[(\d)\]\{([^{}]*)\}/g, (_, n, x) => `${n === "3" ? "∛" : `${n}√`}${wrap(x)}`);
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_, x) => `√${wrap(x)}`);
    if (s === before) break;
  }
  s = s.replace(/\\sqrt\s*(\d+|[A-Za-z])/g, "√$1");
  // graus: ^\circ, ^{\circ}
  s = s.replace(/\^\s*\{?\\circ\}?/g, "°");
  // símbolos \theta, \cdot...
  s = s.replace(/\\([A-Za-z]+)/g, (m, name: string) => SYMBOLS[name] ?? (["sin", "sen", "cos", "tan", "tg", "log", "ln"].includes(name) ? name : m));
  // expoentes e índices simples: x^2, x^{10}, a_1
  s = s.replace(/\^\{([0-9n+-]+)\}|\^([0-9n])/g, (m, a, b) => [...(a ?? b)].every((c: string) => SUP[c]) ? [...(a ?? b)].map((c: string) => SUP[c]).join("") : m);
  s = s.replace(/_\{(\d+)\}|_(\d)/g, (m, a, b) => [...(a ?? b)].map((c: string) => SUB[c] ?? c).join(""));
  // chaves de agrupamento que sobraram
  s = s.replace(/\{([^{}]*)\}/g, "$1");
  return s;
}

/** Aplica plainMath em todo texto de um JSON da IA, menos nas citações literais do material. */
export function plainMathDeep<T>(value: T, skipKeys: ReadonlySet<string> = new Set(["quote", "quotes", "evidence"])): T {
  if (typeof value === "string") return plainMath(value) as T;
  if (Array.isArray(value)) return value.map((v) => plainMathDeep(v, skipKeys)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, skipKeys.has(k) ? v : plainMathDeep(v, skipKeys)])) as T;
  }
  return value;
}

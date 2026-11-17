"use client";

/**
 * Pétalas de sakura caindo a partir de um ponto da tela (sem biblioteca; elementos criados e
 * removidos sozinhos). Desligado com "reduzir movimento".
 */
export function petals(from?: { x: number; y: number } | Element | null, count = 14) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 3;
  if (from instanceof Element) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else if (from) {
    ({ x, y } = from);
  }
  const colors = ["#f2b8c0", "#f6cdd3", "#eaa0ad", "#fbe3e6"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const spread = 60 + Math.random() * 110;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${Math.cos(angle) * spread}px`);
    p.style.setProperty("--dy", `${120 + Math.random() * 220}px`);
    p.style.setProperty("--rot", `${(Math.random() > 0.5 ? 1 : -1) * (300 + Math.random() * 400)}deg`);
    p.style.setProperty("--t", `${1.3 + Math.random() * 0.9}s`);
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove(), { once: true });
    setTimeout(() => p.remove(), 3500);
  }
}

/** Chuva de pétalas do alto da tela (comemoração grande). */
export function petalRain(count = 36) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => petals({ x: Math.random() * window.innerWidth, y: -10 }, 1), i * 60);
  }
}

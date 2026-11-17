"use client";

import { useEffect } from "react";

/** "Ver no material": rola direto até a citação destacada (o trecho pode ser longo). */
export function ScrollToQuote() {
  useEffect(() => {
    const mark = document.querySelector('[data-testid="source-quote"]');
    if (!mark) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mark.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, []);
  return null;
}

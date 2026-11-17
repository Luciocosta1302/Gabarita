/** "+5 XP" que sobe e some (recompensa visível, como no Duolingo). */
export function XpFloat({ amount, className }: { amount: number; className?: string }) {
  return (
    <span aria-hidden className={`xp-float font-display text-kin text-lg font-extrabold [text-shadow:0_1px_0_var(--ink)] ${className ?? ""}`}>
      +{amount} XP
    </span>
  );
}

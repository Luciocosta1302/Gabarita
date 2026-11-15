import { findQuote } from "@/lib/text/quote";

/** Mostra o texto do trecho com a citação destacada (se encontrada). */
export function Highlighted({ text, quote }: { text: string; quote?: string | null }) {
  const range = quote ? findQuote(text, quote) : null;
  if (!range) return <p className="leading-relaxed whitespace-pre-wrap">{text}</p>;
  const [a, b] = range;
  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {text.slice(0, a)}
      <mark data-testid="source-quote" className="bg-pastel-peach rounded px-0.5">
        {text.slice(a, b)}
      </mark>
      {text.slice(b)}
    </p>
  );
}

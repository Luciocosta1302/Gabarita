import { Fragment, type ReactNode } from "react";

import { findQuote } from "@/lib/text/quote";
import { TIMESTAMP_SPLIT, timestampSeconds, videoAt } from "@/lib/text/timestamps";

/** Com `videoUrl` (transcrição do YouTube), os tempos [mm:ss] viram links para aquele ponto do vídeo. */
function withTimestamps(text: string, videoUrl?: string | null): ReactNode {
  if (!videoUrl) return text;
  return text.split(TIMESTAMP_SPLIT).map((part, i) => {
    const s = timestampSeconds(part);
    return s == null ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <a key={i} href={videoAt(videoUrl, s)} target="_blank" rel="noreferrer noopener" className="text-primary font-medium underline" data-testid="video-time">
        {part}
      </a>
    );
  });
}

/** Mostra o texto do trecho com a citação destacada (se encontrada). */
export function Highlighted({ text, quote, videoUrl }: { text: string; quote?: string | null; videoUrl?: string | null }) {
  const range = quote ? findQuote(text, quote) : null;
  if (!range) return <p className="leading-relaxed whitespace-pre-wrap">{withTimestamps(text, videoUrl)}</p>;
  const [a, b] = range;
  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {withTimestamps(text.slice(0, a), videoUrl)}
      <mark data-testid="source-quote" className="bg-pastel-peach rounded px-0.5">
        {withTimestamps(text.slice(a, b), videoUrl)}
      </mark>
      {withTimestamps(text.slice(b), videoUrl)}
    </p>
  );
}

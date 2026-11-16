import { Fragment, type ReactNode } from "react";

import { parseBlocks } from "./parse";

/**
 * Markdown simples para anotações (sem HTML cru, sem dangerouslySetInnerHTML):
 * # títulos, listas com - ou 1., **negrito**, *itálico*, `código`, > citação e parágrafos.
 */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++} className="bg-muted rounded px-1">{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="grid gap-2 text-sm leading-relaxed" data-testid="note-preview">
      {parseBlocks(source).map((b, i) => {
        if (b.kind === "h") {
          const cls = ["", "text-xl font-bold", "text-lg font-semibold", "font-semibold"][b.level];
          return b.level === 1 ? <h2 key={i} className={cls}>{inline(b.text)}</h2> : b.level === 2 ? <h3 key={i} className={cls}>{inline(b.text)}</h3> : <h4 key={i} className={cls}>{inline(b.text)}</h4>;
        }
        if (b.kind === "ul" || b.kind === "ol") {
          const items = b.items.map((it, j) => <li key={j}>{inline(it)}</li>);
          return b.kind === "ul" ? <ul key={i} className="list-disc space-y-1 pl-5">{items}</ul> : <ol key={i} className="list-decimal space-y-1 pl-5">{items}</ol>;
        }
        const lines = b.text.split("\n").map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </Fragment>
        ));
        return b.kind === "quote" ? <blockquote key={i} className="border-primary/40 text-muted-foreground border-l-4 pl-3">{lines}</blockquote> : <p key={i}>{lines}</p>;
      })}
    </div>
  );
}

/** Blocos do markdown simples das anotações (puro, sem React). */
export type Block = { kind: "h"; level: number; text: string } | { kind: "ul"; items: string[] } | { kind: "ol"; items: string[] } | { kind: "quote"; text: string } | { kind: "p"; text: string };

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const last = blocks.at(-1);
    let m: RegExpMatchArray | null;
    if (!line.trim()) {
      blocks.push({ kind: "p", text: "" });
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      blocks.push({ kind: "h", level: m[1].length, text: m[2] });
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (last?.kind === "ul") last.items.push(m[1]);
      else blocks.push({ kind: "ul", items: [m[1]] });
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (last?.kind === "ol") last.items.push(m[1]);
      else blocks.push({ kind: "ol", items: [m[1]] });
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      if (last?.kind === "quote") last.text += `\n${m[1]}`;
      else blocks.push({ kind: "quote", text: m[1] });
    } else if (last?.kind === "p" && last.text) {
      last.text += `\n${line}`;
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks.filter((b) => b.kind !== "p" || b.text);
}
